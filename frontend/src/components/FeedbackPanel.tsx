import type { ReactNode } from 'react';
import type { TerminalQuality } from '../api/types';
import { REINFORCEMENT_CREATED, feedbackLine } from '../lib/focadaSessionLines';
import { useSession } from '../lib/sessionContext';
import { useSessionKeys } from '../lib/useSessionKeys';
import { SessionFooter } from './SessionShell';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Chip } from './ui/Chip';
import { FocadaLine } from './ui/FocadaLine';

/**
 * Resultado de uma etapa avaliada (Fase 7, redesenhado na Fase 68 - Figma "Daily — redesign
 * proposto"): a Focada reage no lugar do antigo painel com gauge circular. Por padrao a fala dela vai
 * pro rodape fixo junto do "Continuar" (Quiz, Lacuna, Ligar, Roleplay); no Resumo Falado
 * (`focadaInContent`) o feedback da IA e longo e fica no conteudo, com a nota grande em cima.
 *
 * No erro que completa o conta-giros (`penaltyPoints === penaltyThreshold`), avisa que o reforco foi
 * criado, que ele nao gasta a sessao do dia e onde encontrar - antes isso so aparecia na conclusao.
 * Enter continua (mesmo atalho das opcoes).
 */
export function FeedbackPanel({
  passed,
  score,
  showScore = false,
  transcript,
  aiFeedback,
  correctAnswer,
  improvementPoints,
  detail,
  roleplayQuality,
  seed,
  focadaInContent = false,
  onContinue,
}: {
  passed: boolean;
  score: number;
  /** Nota em destaque - so faz sentido onde ha nota parcial (Resumo Falado, Ligar Palavras). */
  showScore?: boolean;
  transcript?: string | null;
  aiFeedback?: string | null;
  /** Conversa por voz (molde v1): devolutiva em duas partes, resposta certa e depois pontos a melhorar. */
  correctAnswer?: string | null;
  improvementPoints?: string | null;
  /** Linha extra especifica do tipo (ex: resposta esperada da lacuna). */
  detail?: ReactNode;
  roleplayQuality?: TerminalQuality | null;
  /** Escolhe a variante da fala padrao (id da atividade: mesma fala a cada render). */
  seed: string;
  focadaInContent?: boolean;
  onContinue?: () => void;
}) {
  const { daily } = useSession();
  const reinforcementNow =
    !passed && !daily.isReinforcement && daily.penaltyThreshold > 0 && daily.penaltyPoints === daily.penaltyThreshold;
  const errorLabel = !passed && !daily.isReinforcement && daily.penaltyPoints > 0 ? ` · ${Math.min(daily.penaltyPoints, daily.penaltyThreshold)}º erro do dia` : '';

  useSessionKeys((key) => {
    if (key === 'Enter' && onContinue) onContinue();
  }, !!onContinue);

  const debrief = correctAnswer
    ? (
        <span className="flex flex-col gap-3">
          <span className="flex flex-col">
            <span className="text-rotulo-sm text-accent">Resposta certa</span>
            <span>{correctAnswer}</span>
          </span>
          {improvementPoints && (
            <span className="flex flex-col">
              <span className="text-rotulo-sm text-project">Pontos a melhorar</span>
              <span>{improvementPoints}</span>
            </span>
          )}
        </span>
      )
    : null;

  // Devolutiva da Focada logo abaixo da resposta (sistema.md regra 4; Figma `17:1282`), uma fala só.
  const label = passed ? 'Focada · acertou' : `Focada · errou${errorLabel}`;

  return (
    <>
      {showScore && (
        <div className="flex flex-wrap items-center gap-4">
          <p className={`font-pixel text-[64px] leading-none ${passed ? 'text-accent' : 'text-alert'}`}>{score}</p>
          <div className="flex flex-col gap-2">
            <Chip tone={passed ? 'verde' : 'vermelho'}>{passed ? 'Aprovado · mínimo 80' : 'Abaixo de 80'}</Chip>
            <p className="text-pequeno text-muted">Nota única que pondera correção e clareza.</p>
          </div>
        </div>
      )}

      {detail}

      <FocadaLine size={focadaInContent ? 'abertura' : 'devolutiva'} tone={passed ? 'acerto' : 'erro'} label={label}>
        {/* A devolutiva (resposta certa + pontos a melhorar) vence o aviso de reforco: o aviso ja tem caixa propria abaixo. */}
        {debrief ?? (reinforcementNow ? REINFORCEMENT_CREATED : (aiFeedback ?? feedbackLine(passed, seed, roleplayQuality)))}
      </FocadaLine>

      {transcript && (
        <details className="border-2 border-stroke bg-base px-4 py-3">
          <summary className="cursor-pointer text-rotulo-sm text-secondary">O que você disse</summary>
          <p className="mt-2 text-pequeno text-primary">“{transcript}”</p>
        </details>
      )}

      {/* Reforço é pendência: âmbar, nunca vermelho (sistema.md regra 6). */}
      {reinforcementNow && (
        <Card kind="ambar" pad="gap-1 px-4 py-3" eyebrow={`Reforço do Dia ${daily.dayNumber} criado`}>
          <p className="text-pequeno text-secondary">
            As etapas que você errou viram uma sessão curta. Ela fica na Trilha e no Início até você fazer, e não gasta o Dia de hoje.
          </p>
        </Card>
      )}

      <SessionFooter>{onContinue && <Button onClick={onContinue}>Continuar</Button>}</SessionFooter>
    </>
  );
}
