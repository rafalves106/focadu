import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto, RoleplayNodeDto } from '../api/types';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { useSessionKeys } from '../lib/useSessionKeys';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionFooter, SessionLayout } from './SessionShell';
import { BlockIntro } from './session/BlockIntro';
import terminalIcon from '../assets/pixel/terminal.png';

/**
 * Roleplay: navega o grafo inteiramente client-side (todos os nodes/opcoes ja vieram no
 * DailyActivityDto). "start" e a convencao do node inicial (nao ha campo IsStart no dominio). So ao
 * atingir um node terminal e que enviamos SelectedRoleplayNodeId - o Score vem do TerminalQuality.
 *
 * Fase 68 (Figma "Daily — 10"): cena de RPG - cenario numa caixa ambar com a fala do node em VT323,
 * escolhas como menu (teclas 1-N) e "Decisao N" no cabecalho. Sem "passo N de M": o grafo tem
 * profundidade variavel por caminho, contar o total seria inventar precisao.
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
  const [depth, setDepth] = useState(1);
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
      // TerminalQuality so vem preenchida depois de responder (gabarito) - busca de novo o node.
      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      setFinalNode(refreshedActivity?.roleplayNodes.find((n) => n.id === node.id) ?? node);
      setLastResponse(result.response);
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleChooseOption(nextNodeId: string | null) {
    if (!nextNodeId || submitting) return;
    const nextNode = nodesById.get(nextNodeId);
    if (!nextNode) return;
    if (nextNode.isTerminal) {
      setCurrentNodeId(nextNode.id);
      void handleReachTerminal(nextNode);
      return;
    }
    setCurrentNodeId(nextNode.id);
    setDepth((d) => d + 1);
  }

  const choosing = started && !answered && !!displayNode && !displayNode.isTerminal;
  useSessionKeys((key) => {
    const n = Number(key);
    const option = displayNode?.options[n - 1];
    if (Number.isInteger(n) && option) handleChooseOption(option.nextNodeId);
  }, choosing);

  if (!started) return <BlockIntro activity={activity} onStart={() => setStarted(true)} />;

  if (!displayNode) {
    return (
      <SessionLayout>
        <p className="text-secondary">Esta atividade ainda não tem diálogo configurado.</p>
      </SessionLayout>
    );
  }

  return (
    <SessionLayout sub={answered ? 'Desfecho' : `Decisão ${depth} · sem volta`}>
      <div className="flex flex-col gap-3 border-2 border-project bg-base px-5 py-4">
        <div className="flex items-start gap-2.5">
          <img src={terminalIcon} alt="" className="mt-0.5 size-4 shrink-0 pixelated" />
          <p className="font-pixel text-lg leading-tight text-secondary">{activity.prompt}</p>
        </div>
        <p className="font-pixel text-2xl leading-[1.15] text-primary lg:text-[28px]">{displayNode.text}</p>
      </div>

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      {choosing && (
        <div className="flex flex-col gap-2">
          <p className="font-pixel-label text-[9px] text-secondary">Escolha sua ação</p>
          {displayNode.options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              disabled={submitting}
              onClick={() => handleChooseOption(option.nextNodeId)}
              className="group flex items-center gap-3 border-2 border-stroke px-4 py-3 text-left hover:border-project hover:bg-surface-alt focus-visible:border-project disabled:opacity-50"
            >
              <span className="w-4 shrink-0 font-pixel-label text-[11px] text-muted group-hover:text-project">{index + 1}</span>
              <span className="font-pixel text-xl leading-tight text-secondary group-hover:text-primary">{option.text}</span>
            </button>
          ))}
          <SessionFooter>
            <p className="font-pixel-label text-[8px] text-muted">Teclas 1–{displayNode.options.length} escolhem · cada decisão é definitiva</p>
          </SessionFooter>
        </div>
      )}

      {submitting && <p className="font-pixel text-xl text-secondary">Chegando no desfecho...</p>}

      {answered && lastResponse && (
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          seed={activity.id}
          roleplayQuality={displayNode.terminalQuality}
          onContinue={onContinue}
        />
      )}
    </SessionLayout>
  );
}
