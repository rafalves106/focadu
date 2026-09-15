import { useState } from 'react';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { ActivityStatus, type DailyStateDto } from '../api/types';
import { StudyAssistantPanel } from './assistant/StudyAssistantPanel';
import { ContentPreviewModal } from './ContentPreviewModal';
import { MaterialSidebar } from './MaterialSidebar';
import { QuickNotePanel } from './notebook/QuickNotePanel';
import { PomodoroWidget } from './pomodoro/PomodoroWidget';

/**
 * "Material de hoje" pronto pra usar (Fase 19) - busca a Weekly (pra pegar `curatedContents`) e
 * monta o `<MaterialSidebar>` com os itens da Daily atual + quais ja foram concluidos, mesmo
 * calculo que ReadingActivity/VideoActivity ja faziam desde a Fase 7, agora reaproveitado tambem
 * por Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado. `activeContentId` so existe pra
 * Reading/Video (unicos tipos com ContentId proprio de leitura/video, ver DailyActivity.ctor) -
 * as outras atividades passam `null` (nenhum item em destaque, so os concluidos aparecem).
 *
 * Fase 29: ganhou o `<QuickNotePanel>` do Caderninho de Anotacoes - decisao do rascunho
 * (secret/rascunhos/caderninho-de-anotacoes.md): nenhuma funcionalidade atual (reler/reassistir
 * material) e perdida, so acrescenta.
 *
 * Fase 36: mesmo padrao aditivo, mais o `<PomodoroWidget>` (ver
 * secret/rascunhos/timer-pomodoro-sessao.md) - timer manual (aluno liga/desliga, sem relacao com
 * Daily.Start/Resume/Complete), sincronizado com a versao compacta do header via
 * `lib/pomodoroTimer` (store modulo-level, mesmo padrao de dailyPenaltyContext).
 *
 * Fase 37: reagrupado em 2 colunas balanceadas (pedido explicito) - `materialSidebar` (esquerda,
 * vira `leftSidebar` no `SessionLayout`) tem "Material de hoje" + `<PomodoroWidget>` (movido pra
 * ca, antes ficava com o Caderninho); `sidebar` (direita) tem `<QuickNotePanel>` + o novo
 * `<StudyAssistantPanel>` (Suporte Rapido de IA em formato de card fixo, ver doc daquele arquivo -
 * substitui o botao flutuante `StudyAssistantWidget` nestas telas). As colunas ficam com a mesma
 * altura do cartao central via `items-stretch` no `SessionLayout`; a coluna esquerda deixa o
 * PROPRIO `<PomodoroWidget>` crescer pra preencher o espaco sobrando (`flex-1` nele mesmo, ver doc
 * daquele arquivo - pedido explicito: "o card podia ocupar esse espaco" em vez de sobrar vao vazio
 * acima dele). A coluna direita ainda usa `justify-between` (Caderninho de tamanho fixo + vao antes
 * do chat) - candidato a virar o mesmo padrao se pedirem simetria com a esquerda.
 *
 * Arquivo proprio (separado de SessionShell.tsx) pelo mesmo motivo de lib/statusBadge.ts -
 * co-exportar hook e componente do mesmo arquivo quebra o fast refresh.
 */
export function useMaterialSidebar(daily: DailyStateDto, activeContentId: string | null = null) {
  const { data: weekly } = useApiResource(() => api.getWeekly(daily.weeklyId), [daily.weeklyId]);
  const [previewContentId, setPreviewContentId] = useState<string | null>(null);

  const completedContentIds = new Set(
    daily.activities.filter((a) => a.status === ActivityStatus.Completed && a.contentId).map((a) => a.contentId!),
  );
  // "Material de hoje" = so o conteudo referenciado pelas atividades DESTA Daily - weekly.curatedContents
  // traz os 4 dias juntos (CuratedContent nao tem DailyId, so pertence a Weekly), sem esse filtro o
  // sidebar mostraria a semana inteira.
  const todaysContentIds = new Set(daily.activities.filter((a) => a.contentId).map((a) => a.contentId!));

  const materialSidebar = weekly ? (
    <div className="flex flex-col gap-4">
      <MaterialSidebar
        contents={weekly.curatedContents.filter((c) => todaysContentIds.has(c.id))}
        activeContentId={activeContentId}
        completedContentIds={completedContentIds}
        onSelect={setPreviewContentId}
      />
      <PomodoroWidget />
      {previewContentId && (
        <ContentPreviewModal
          contentId={previewContentId}
          dailyId={daily.id}
          courseId={weekly.courseId}
          onClose={() => setPreviewContentId(null)}
        />
      )}
    </div>
  ) : undefined;

  const sidebar = weekly ? (
    <div className="flex flex-col justify-between gap-4">
      <QuickNotePanel dailyId={daily.id} courseId={weekly.courseId} />
      <StudyAssistantPanel />
    </div>
  ) : undefined;

  return { weekly, materialSidebar, sidebar };
}
