import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { WarmupQuestionDto } from '../../api/types';
import { useSessionKeys } from '../../lib/useSessionKeys';
import { OptionCard } from '../activities/OptionCard';
import { SessionFooter, SessionLayout } from '../SessionShell';
import { FocadaLine } from '../ui/FocadaLine';
import { Button } from '../ui/Button';

// Mesma regra da lacuna no dia (SubmitActivityResponseUseCase): so ignora maiuscula e espaco nas pontas.
const norm = (text: string) => text.toLowerCase().trim();

/**
 * Aquecimento (molde v1, Figma "Fase 1 - C / Aquecimento"): antes dos blocos do dia, 2 perguntas de dias anteriores
 * que o aluno ja respondeu. Nao e atividade do dia: nao gasta tentativa, nao conta erro, nao entra no Score e nada
 * e gravado. O gabarito ja foi revelado quando ele respondeu a pergunta no dia de origem, entao a conferencia e feita
 * aqui mesmo. "Pular" fica sempre visivel e uma falha de carga nunca trava o dia (`onDone` segue pra sessao).
 */
export function WarmupScreen({ dailyId, onDone }: { dailyId: string; onDone: () => void }) {
  const [questions, setQuestions] = useState<WarmupQuestionDto[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setQuestions(null);
    api
      .getWarmup(dailyId)
      .then((result) => {
        if (cancelled) return;
        // Primeiro dia (nada respondido antes): sem aquecimento, entra direto na sessao.
        if (result.length === 0) onDone();
        else setQuestions(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyId, attempt]);

  const question = questions?.[index] ?? null;
  const hasOptions = !!question && question.quizOptions.length > 0;
  const correctOption = question?.quizOptions.find((o) => o.isCorrect === true) ?? null;
  const isCorrect = !question
    ? false
    : hasOptions
      ? correctOption !== null && selectedId === correctOption.id
      : !!question.expectedAnswer && norm(typed) === norm(question.expectedAnswer);
  const canConfirm = hasOptions ? selectedId !== null : typed.trim().length > 0;

  function next() {
    if (!questions) return;
    if (index + 1 >= questions.length) {
      onDone();
      return;
    }
    setIndex(index + 1);
    setSelectedId(null);
    setTyped('');
    setRevealed(false);
  }

  function confirm() {
    if (canConfirm && !revealed) setRevealed(true);
  }

  useSessionKeys((key) => {
    if (!question || revealed) {
      if (key === 'Enter' && revealed) next();
      return;
    }
    const n = Number(key);
    if (hasOptions && Number.isInteger(n) && n >= 1 && n <= question.quizOptions.length) setSelectedId(question.quizOptions[n - 1].id);
    else if (key === 'Enter') confirm();
  }, question !== null);

  if (failed) {
    return (
      <SessionLayout label="Aquecimento" chain="none" centered>
        <FocadaLine>
          Não consegui buscar as perguntas de aquecimento agora. Seu dia não depende delas — dá pra seguir.
        </FocadaLine>
        <SessionFooter>
          <Button kind="secundario" onClick={() => setAttempt((n) => n + 1)}>
            Tentar de novo
          </Button>
          <Button onClick={onDone}>Seguir pro dia</Button>
        </SessionFooter>
      </SessionLayout>
    );
  }

  if (!question || !questions) {
    return (
      <SessionLayout label="Aquecimento" chain="none" centered>
        <p className="text-corpo text-secondary">Buscando perguntas de dias anteriores...</p>
      </SessionLayout>
    );
  }

  return (
    <SessionLayout label="Aquecimento" sub={`Pergunta ${index + 1} de ${questions.length}`} chain="none" showGauge={false}>
      <p className="text-pequeno text-muted">
        Do Dia {question.dayNumber} da Semana {question.weekNumber}. Não conta erro nem nota.
      </p>
      <p className="text-lead text-primary">{question.prompt}</p>

      {hasOptions ? (
        <div className="flex flex-col gap-2.5">
          {question.quizOptions.map((option, i) => {
            const isSelected = option.id === selectedId;
            const state = revealed
              ? option.isCorrect === true
                ? 'correct'
                : isSelected
                  ? 'wrong'
                  : 'dimmed'
              : isSelected
                ? 'selected'
                : 'neutral';
            return <OptionCard key={option.id} label={String(i + 1)} text={option.text} state={state} disabled={revealed} onClick={() => setSelectedId(option.id)} />;
          })}
        </div>
      ) : (
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={revealed}
          placeholder="Escreva a lacuna"
          aria-label="Resposta da lacuna"
          className="h-12 border-2 border-stroke-strong bg-base px-4 text-corpo text-primary focus:border-accent focus:outline-none"
        />
      )}

      {revealed && (
        <FocadaLine tone={isCorrect ? 'acerto' : 'neutro'} size="devolutiva">
          {isCorrect
            ? 'Isso. Você ainda lembra.'
            : `Quase. A resposta era: ${hasOptions ? correctOption?.text : question.expectedAnswer}. Volta agora, vai ficar.`}
        </FocadaLine>
      )}

      <SessionFooter>
        <Button kind="secundario" onClick={onDone}>
          Pular aquecimento
        </Button>
        {revealed ? (
          <Button onClick={next}>{index + 1 >= questions.length ? 'Começar o dia' : 'Próxima'}</Button>
        ) : (
          <Button onClick={confirm} disabled={!canConfirm}>
            Confirmar
          </Button>
        )}
      </SessionFooter>
    </SessionLayout>
  );
}
