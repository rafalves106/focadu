import { useLayoutEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { IntroCard } from './activities/IntroCard';
import { OptionCard } from './activities/OptionCard';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Item atualmente "armado" aguardando seu par (toque no termo primeiro OU na definição primeiro - ambos os fluxos funcionam). */
type Pending = { side: 'term'; id: string } | { side: 'definition'; id: string } | null;

type ConnectorLine = { key: string; x1: number; y1: number; x2: number; y2: number; color: string };

/**
 * Linhas organicas conectando cada par ligado (Fase 23, pedido ao vivo: so a letra A/B/C nao
 * ficou visual o suficiente). Mede a posicao real dos cards via ref (nao ha lib de drag-and-drop/
 * diagrama no projeto que já resolvesse isso) e desenha uma curva bezier simples entre a borda
 * direita do termo e a esquerda da definicao - "organico" o bastante sem trazer uma lib de grafos
 * so pra 1 curva por par.
 */
function useConnectorLines(pairs: { termId: string; definitionId: string; color: string }[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termNodes = useRef(new Map<string, HTMLDivElement>());
  const defNodes = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  // `pairs` e um array novo a cada render (recriado no componente que chama este hook) - usar a
  // referencia direto como dependencia do efeito reroda toda vez, setLines gera outro array novo,
  // outro render... loop infinito. Chave estavel por conteudo em vez da referencia.
  const pairsKey = pairs.map((p) => `${p.termId}:${p.definitionId}:${p.color}`).join('|');

  useLayoutEffect(() => {
    function recompute() {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const next: ConnectorLine[] = [];

      for (const { termId, definitionId, color } of pairs) {
        const fromEl = termNodes.current.get(termId);
        const toEl = defNodes.current.get(definitionId);
        if (!fromEl || !toEl) continue;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        // Colunas empilhadas (mobile, grid-cols-1): termo e definicao nao ficam lado a lado -
        // pular a linha em vez de cruzar por cima dos outros cards.
        if (toRect.left < fromRect.right) continue;

        next.push({
          key: `${termId}-${definitionId}`,
          x1: fromRect.right - containerRect.left,
          y1: fromRect.top + fromRect.height / 2 - containerRect.top,
          x2: toRect.left - containerRect.left,
          y2: toRect.top + toRect.height / 2 - containerRect.top,
          color,
        });
      }
      setLines(next);
    }

    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairsKey]);

  function registerTerm(id: string, el: HTMLDivElement | null) {
    if (el) termNodes.current.set(id, el);
    else termNodes.current.delete(id);
  }

  function registerDefinition(id: string, el: HTMLDivElement | null) {
    if (el) defNodes.current.set(id, el);
    else defNodes.current.delete(id);
  }

  return { containerRef, lines, registerTerm, registerDefinition };
}

function ConnectorSvg({ lines }: { lines: ConnectorLine[] }) {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      {lines.map((line) => {
        const midX = (line.x1 + line.x2) / 2;
        return (
          <path
            key={line.key}
            d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
            fill="none"
            stroke={line.color}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

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
  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || activity.responses.length > 0);
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

  // Letra de conexao (A/B/C...) por termo - mantida como reforco visual redundante a linha
  // organica abaixo (acessibilidade: nem todo mundo distingue as cores accent/alert).
  const letterByTermId = new Map(terms.map((term, index) => [term.id, LETTERS[index]]));

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

  // Pares a desenhar como linha: antes de responder, so os ja ligados (verde = "em andamento");
  // respondido com o palpite em memoria, o veredito real por par; sem memoria do palpite (reload),
  // o gabarito inteiro (sempre verde). Hook chamado incondicionalmente (regra dos hooks) - antes
  // do `if (!started)` abaixo.
  const pairsToDraw = answered
    ? knowsSubmittedMatches
      ? Object.entries(matches).map(([termId, definitionId]) => ({
          termId,
          definitionId,
          color: termVerdict(termId) === 'correct' ? 'var(--color-accent)' : 'var(--color-alert)',
        }))
      : terms
          .filter((t): t is typeof t & { correctDefinitionId: string } => t.correctDefinitionId != null)
          .map((t) => ({ termId: t.id, definitionId: t.correctDefinitionId, color: 'var(--color-accent)' }))
    : Object.entries(matches).map(([termId, definitionId]) => ({ termId, definitionId, color: 'var(--color-accent)' }));
  const { containerRef, lines, registerTerm, registerDefinition } = useConnectorLines(pairsToDraw);

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

      <div ref={containerRef} className="relative grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ConnectorSvg lines={lines} />

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
              <div key={term.id} ref={(el) => registerTerm(term.id, el)}>
                <OptionCard
                  label={letter}
                  text={term.text}
                  state={state}
                  disabled={answered || submitting}
                  onClick={() => handleTermClick(term.id)}
                />
              </div>
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
              <div key={definition.id} ref={(el) => registerDefinition(definition.id, el)}>
                <OptionCard
                  label={letter}
                  text={definition.text}
                  state={state}
                  disabled={answered || submitting}
                  onClick={() => handleDefinitionClick(definition.id)}
                />
              </div>
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
