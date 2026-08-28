import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { IntroCard } from './activities/IntroCard';
import { OptionCard } from './activities/OptionCard';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Item atualmente "armado" aguardando seu par (toque no termo primeiro OU na definição primeiro - ambos os fluxos funcionam). */
type Pending = { side: 'term'; id: string } | { side: 'definition'; id: string } | null;

/**
 * Ligar Palavras (Fase 4/9, reformado na Fase 23 pra bater com o Figma "sessao-ligar-palavras":
 * matcher visual de 2 colunas). Reforma de contrato inteira, não só UI (ver docs/ARQUITETURA.md):
 * até a Fase 21, cada termo era 1 DailyActivity pontuada independente; desde a Fase 23, 1
 * DailyActivity guarda o grupo de pares inteiro (WordMatchTerms/WordMatchDefinitions),
 * respondido/pontuado de uma vez só (`wordMatchMatches`, ver OptionsAnswer pro equivalente de
 * Quiz). Isso também simplificou TodayPage: WordMatch virou uma atividade comum, sem mais o
 * `Step.kind === 'wordMatchGroup'` especial (várias DailyActivity WordMatch no mesmo dia agora só
 * viram várias etapas sequenciais, uma por grupo).
 *
 * Interação por toque (tap-to-connect), não drag-and-drop: funciona igual em mouse e touch sem
 * precisar de biblioteca nova (nenhuma no projeto) nem 2 implementações de gesto separadas -
 * ponytail: se um dia drag-and-drop visual for pedido explicitamente, isto aqui já cobre o dado
 * (estado `matches`), só trocaria a interação de captura.
 */
export function WordMatchActivity({
  dailyId,
  daily,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [started, setStarted] = useState(activity.responses.length > 0);
  const { weekly, sidebar } = useMaterialSidebar(daily);

  const [terms, setTerms] = useState(activity.wordMatchTerms);
  const [definitions, setDefinitions] = useState(activity.wordMatchDefinitions);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Pending>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);

  const answered = lastResponse !== null;
  const total = terms.length;
  const matchedCount = Object.keys(matches).length;
  const allMatched = matchedCount === total;

  // Letra de conexao (A/B/C...) por termo - so um rotulo visual pra ligar os dois lados sem SVG,
  // fixo pela ordem dos termos (nao muda quando o usuario refaz uma escolha).
  const letterByTermId = new Map(terms.map((term, index) => [term.id, LETTERS[index]]));

  function connect(termId: string, definitionId: string) {
    setMatches((prev) => ({ ...prev, [termId]: definitionId }));
    setPending(null);
  }

  function handleTermClick(termId: string) {
    if (answered || submitting) return;

    if (matches[termId]) {
      // Ja ligado - toca de novo pra desfazer e escolher outra definicao.
      setMatches((prev) => {
        const next = { ...prev };
        delete next[termId];
        return next;
      });
      setPending({ side: 'term', id: termId });
      return;
    }

    if (pending?.side === 'definition') {
      connect(termId, pending.id);
      return;
    }

    setPending((prev) => (prev?.side === 'term' && prev.id === termId ? null : { side: 'term', id: termId }));
  }

  function handleDefinitionClick(definitionId: string) {
    if (answered || submitting) return;

    const matchedTermId = Object.entries(matches).find(([, defId]) => defId === definitionId)?.[0];
    if (matchedTermId) {
      setMatches((prev) => {
        const next = { ...prev };
        delete next[matchedTermId];
        return next;
      });
      setPending({ side: 'definition', id: definitionId });
      return;
    }

    if (pending?.side === 'term') {
      connect(pending.id, definitionId);
      return;
    }

    setPending((prev) => (prev?.side === 'definition' && prev.id === definitionId ? null : { side: 'definition', id: definitionId }));
  }

  async function handleSubmit() {
    if (!allMatched) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitActivityResponse(dailyId, activity.id, { wordMatchMatches: matches });
      setLastResponse(result.response);

      // Depois de responder, o gabarito e revelado (mesmo padrao de OptionsAnswer) - busca o
      // estado atualizado pra pegar CorrectDefinitionId preenchido.
      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      if (refreshedActivity) {
        setTerms(refreshedActivity.wordMatchTerms);
        setDefinitions(refreshedActivity.wordMatchDefinitions);
      }
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!started) {
    return (
      <IntroCard
        badge="Ligar palavras"
        title="Associe os termos"
        description={`Toque num termo e depois na definição certa - ${total} pares ao todo.`}
        rules={['1 tentativa por grupo - confirme só depois de ligar todos os pares.']}
        ctaLabel="COMEÇAR"
        onStart={() => setStarted(true)}
      />
    );
  }

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const stepTotal = sortedActivities.length;

  // `matches` só existe enquanto o componente ficou montado durante a tentativa (não é
  // persistido) - ao reabrir uma atividade já respondida antes (replay, reload no meio do
  // caminho), matches volta vazio e não há como saber o que o usuário tinha escolhido. Nesse
  // caso, cai pro reveal "gabarito" (sempre verde, nunca vermelho) em vez de inventar acerto/erro.
  const knowsSubmittedMatches = Object.keys(matches).length > 0;

  // Verdade da conexao formada por este termo (so quando sabemos o que foi enviado). Ambos os
  // lados de uma conexao (termo + a definicao ligada a ele) sempre mostram o MESMO veredito,
  // porque sao o mesmo par na resposta enviada.
  function termVerdict(termId: string): 'correct' | 'wrong' {
    const term = terms.find((t) => t.id === termId);
    return term && matches[termId] === term.correctDefinitionId ? 'correct' : 'wrong';
  }

  function pendingState(side: 'term' | 'definition', id: string) {
    return pending?.side === side && pending.id === id ? 'selected' : 'neutral';
  }

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${stepTotal} — LIGAR PALAVRAS`}
      progress={(stepIndex + 1) / stepTotal}
      sidebar={sidebar}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[22px] font-semibold leading-[1.3] text-primary">Conecte cada termo à sua definição</p>
        <p className="text-xs text-secondary">{matchedCount} de {total} pares ligados</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          {terms.map((term) => {
            const known = answered && !knowsSubmittedMatches; // reveal "gabarito", sem palpite do usuario
            const letter = known || matches[term.id] ? letterByTermId.get(term.id) : undefined;
            const state = answered
              ? (knowsSubmittedMatches ? termVerdict(term.id) : 'correct')
              : matches[term.id]
                ? 'selected'
                : pendingState('term', term.id);
            return (
              <OptionCard
                key={term.id}
                label={letter}
                text={term.text}
                state={state}
                disabled={answered || submitting}
                onClick={() => handleTermClick(term.id)}
              />
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {definitions.map((definition) => {
            // Antes de responder (ou com o palpite em memoria): quem esta ligado a esta definicao.
            // No reveal sem memoria do palpite: o termo pra quem ESTA e a resposta certa.
            const ownerTermId =
              answered && !knowsSubmittedMatches
                ? terms.find((t) => t.correctDefinitionId === definition.id)?.id
                : Object.entries(matches).find(([, defId]) => defId === definition.id)?.[0];
            const letter = ownerTermId ? letterByTermId.get(ownerTermId) : undefined;
            const state = answered
              ? (knowsSubmittedMatches ? (ownerTermId ? termVerdict(ownerTermId) : 'dimmed') : 'correct')
              : ownerTermId
                ? 'selected'
                : pendingState('definition', definition.id);
            return (
              <OptionCard
                key={definition.id}
                label={letter}
                text={definition.text}
                state={state}
                disabled={answered || submitting}
                onClick={() => handleDefinitionClick(definition.id)}
              />
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      {!answered && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allMatched || submitting}
          className="rounded-xl bg-accent px-4 py-3.5 text-sm font-bold tracking-wide text-base disabled:opacity-40"
        >
          {submitting ? 'ENVIANDO...' : 'CONFIRMAR RESPOSTA'}
        </button>
      )}

      {answered && lastResponse && (
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          headline={{ pass: 'Acertou todos! 🎉', fail: 'Quase lá - confira os pares certos acima.' }}
          onContinue={onContinue}
        />
      )}
    </SessionLayout>
  );
}
