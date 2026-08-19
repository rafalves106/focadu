import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto, RoleplayNodeDto } from '../api/types';
import { TerminalQuality } from '../api/types';
import { ActivityScreen } from './Layout';

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
 */
export function RoleplayActivity({
  dailyId,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const nodesById = new Map(activity.roleplayNodes.map((n) => [n.id, n]));
  const startNode = activity.roleplayNodes.find((n) => n.nodeKey === 'start') ?? activity.roleplayNodes[0];

  const [currentNodeId, setCurrentNodeId] = useState<string | null>(startNode?.id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);
  const [finalNode, setFinalNode] = useState<RoleplayNodeDto | null>(null);

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

  if (!displayNode) {
    return (
      <ActivityScreen eyebrow="Roleplay" title={activity.prompt ?? ''}>
        <p className="text-secondary">Esta atividade ainda não tem diálogo configurado.</p>
      </ActivityScreen>
    );
  }

  return (
    <ActivityScreen eyebrow="Roleplay" title={activity.prompt ?? ''}>
      <div className="rounded-xl border border-surface-alt bg-surface p-4">
        <p className="text-primary">{displayNode.text}</p>
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      {!answered && !displayNode.isTerminal && (
        <div className="flex flex-col gap-3">
          {displayNode.options.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={submitting}
              onClick={() => handleChooseOption(option.nextNodeId)}
              className="rounded-xl border border-surface-alt bg-surface px-4 py-3 text-left text-primary transition-colors enabled:hover:border-accent disabled:opacity-40"
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {answered && lastResponse && (
        <div>
          <p className={`font-semibold ${lastResponse.passed ? 'text-accent' : 'text-alert'}`}>
            {lastResponse.passed ? 'Desfecho ideal! 🎉' : 'Desfecho não ideal - dá uma olhada no que rolou.'}
          </p>
          {displayNode.terminalQuality !== null && (
            <p className="mt-1 text-sm text-secondary">
              Qualidade do desfecho: {TERMINAL_QUALITY_LABEL[displayNode.terminalQuality]}
            </p>
          )}
          <button
            type="button"
            onClick={onContinue}
            className="mt-4 rounded-xl border border-surface-alt bg-surface px-4 py-3 font-semibold text-primary hover:border-accent"
          >
            Continuar
          </button>
        </div>
      )}
    </ActivityScreen>
  );
}
