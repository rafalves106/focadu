import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto, RoleplayNodeDto } from '../api/types';
import { TerminalQuality } from '../api/types';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { FeedbackPanel } from './FeedbackPanel';
import { IntroCard } from './activities/IntroCard';
import { OptionCard } from './activities/OptionCard';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

const TERMINAL_QUALITY_LABEL: Record<number, string> = {
  [TerminalQuality.Ideal]: 'Ideal',
  [TerminalQuality.Suboptimal]: 'Razoável',
  [TerminalQuality.Poor]: 'Fraco',
};

/**
 * Roleplay: navega o grafo inteiramente client-side (todos os nodes/opcoes ja vieram no
 * DailyActivityDto - ver WeeklyRepository.FullGraph no backend). "start" e a convencao adotada
 * pro node inicial (nao ha campo IsStart no dominio). So ao atingir um node terminal e que
 * enviamos SelectedRoleplayNodeId - o Score vem do TerminalQuality alcancado.
 *
 * Fase 9 (design Figma "Roleplay 1-6"): ganhou Intro (`started`) e as decisoes usam OptionCard
 * (sem letra A/B/C - sao acoes, nao alternativas de multipla escolha).
 *
 * Fase 19 (fidelidade revisada, node "sessao-roleplay"): o cenario (`activity.prompt`) agora fica
 * visivel o tempo todo acima do no atual (bloco "CENÁRIO"), nao so na Intro - dado que ja existia,
 * so a exibicao ficou persistente. O indicador "arvore de decisao" numerada (1→2→3→4) do mockup
 * foi omitido: o grafo tem profundidade/ramificacao variavel por caminho (nao um numero fixo de
 * passos), mostrar "passo N de 4" seria inventar uma precisao que o dominio nao garante.
 */
export function RoleplayActivity({
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
  const nodesById = new Map(activity.roleplayNodes.map((n) => [n.id, n]));
  const startNode = activity.roleplayNodes.find((n) => n.nodeKey === 'start') ?? activity.roleplayNodes[0];

  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || activity.responses.length > 0);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(startNode?.id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);
  const [finalNode, setFinalNode] = useState<RoleplayNodeDto | null>(null);
  const { weekly, sidebar } = useMaterialSidebar(daily);

  const answered = lastResponse !== null;
  const currentNode = currentNodeId ? nodesById.get(currentNodeId) : undefined;
  const displayNode = answered ? (finalNode ?? currentNode) : currentNode;

  async function handleReachTerminal(node: RoleplayNodeDto) {
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitActivityResponse(dailyId, activity.id, { selectedRoleplayNodeId: node.id });
      setLastResponse(result.response);

      // TerminalQuality so vem preenchida depois de responder (gabarito) - busca de novo pra
      // pegar o node atualizado, ja que o "node" local ainda tem TerminalQuality nula.
      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      const refreshedNode = refreshedActivity?.roleplayNodes.find((n) => n.id === node.id);
      setFinalNode(refreshedNode ?? node);
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChooseOption(nextNodeId: string | null) {
    if (!nextNodeId || submitting) return;
    const nextNode = nodesById.get(nextNodeId);
    if (!nextNode) return;

    if (nextNode.isTerminal) {
      void handleReachTerminal(nextNode);
      return;
    }

    setCurrentNodeId(nextNode.id);
  }

  if (!started) {
    return (
      <IntroCard
        badge="Roleplay"
        title="Roleplay"
        description={activity.prompt ?? ''}
        rules={['Cada decisão leva a um desfecho diferente.', 'Só é possível responder ao chegar num desfecho (nó terminal).']}
        ctaLabel="COMEÇAR"
        onStart={() => setStarted(true)}
      />
    );
  }

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const total = sortedActivities.length;

  if (!displayNode) {
    return (
      <SessionLayout
        eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
        stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — ROLEPLAY`}
        progress={(stepIndex + 1) / total}
        sidebar={sidebar}
      >
        <p className="text-secondary">Esta atividade ainda não tem diálogo configurado.</p>
      </SessionLayout>
    );
  }

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — ROLEPLAY`}
      progress={(stepIndex + 1) / total}
      sidebar={sidebar}
    >
      <span className="w-fit rounded-full border border-project bg-project/15 px-3 py-2 text-[11px] font-bold tracking-[0.5px] text-project uppercase">
        Roleplay de decisões
      </span>

      <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-bold tracking-[1px] text-muted uppercase">Cenário</p>
        <div className="relative overflow-hidden rounded-xl border border-stroke bg-surface-alt py-3.5 pr-4 pl-5">
          <span className="absolute inset-y-0 left-0 w-1 bg-project" aria-hidden="true" />
          <p className="text-base leading-relaxed text-secondary">{activity.prompt}</p>
        </div>
      </div>

      <div className="rounded-xl border border-stroke bg-surface-alt p-5 leading-relaxed">
        <p className="text-primary">{displayNode.text}</p>
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      {!answered && !displayNode.isTerminal && (
        <div className="flex flex-col gap-3">
          {displayNode.options.map((option, index) => (
            <OptionCard
              key={option.id}
              label={`${index + 1}`}
              text={option.text}
              state="neutral"
              disabled={submitting}
              onClick={() => handleChooseOption(option.nextNodeId)}
            />
          ))}
        </div>
      )}

      {answered && lastResponse && (
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          headline={{ pass: 'Desfecho ideal! 🎉', fail: 'Desfecho não ideal - dá uma olhada no que rolou.' }}
          detail={
            displayNode.terminalQuality !== null && (
              <p className="text-sm text-secondary">
                Qualidade do desfecho: {TERMINAL_QUALITY_LABEL[displayNode.terminalQuality]}
              </p>
            )
          }
          onContinue={onContinue}
        />
      )}
    </SessionLayout>
  );
}
