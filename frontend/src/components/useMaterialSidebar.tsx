import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { ActivityStatus, type DailyStateDto } from '../api/types';
import { MaterialSidebar } from './MaterialSidebar';

/**
 * "Material de hoje" pronto pra usar (Fase 19) - busca a Weekly (pra pegar `curatedContents`) e
 * monta o `<MaterialSidebar>` com os itens da Daily atual + quais ja foram concluidos, mesmo
 * calculo que ReadingActivity/VideoActivity ja faziam desde a Fase 7, agora reaproveitado tambem
 * por Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado. `activeContentId` so existe pra
 * Reading/Video (unicos tipos com ContentId proprio de leitura/video, ver DailyActivity.ctor) -
 * as outras atividades passam `null` (nenhum item em destaque, so os concluidos aparecem).
 *
 * Arquivo proprio (separado de SessionShell.tsx) pelo mesmo motivo de lib/statusBadge.ts -
 * co-exportar hook e componente do mesmo arquivo quebra o fast refresh.
 */
export function useMaterialSidebar(daily: DailyStateDto, activeContentId: string | null = null) {
  const { data: weekly } = useApiResource(() => api.getWeekly(daily.weeklyId), [daily.weeklyId]);

  const completedContentIds = new Set(
    daily.activities.filter((a) => a.status === ActivityStatus.Completed && a.contentId).map((a) => a.contentId!),
  );
  // "Material de hoje" = so o conteudo referenciado pelas atividades DESTA Daily - weekly.curatedContents
  // traz os 4 dias juntos (CuratedContent nao tem DailyId, so pertence a Weekly), sem esse filtro o
  // sidebar mostraria a semana inteira.
  const todaysContentIds = new Set(daily.activities.filter((a) => a.contentId).map((a) => a.contentId!));

  const sidebar = weekly ? (
    <MaterialSidebar
      contents={weekly.curatedContents.filter((c) => todaysContentIds.has(c.id))}
      activeContentId={activeContentId}
      completedContentIds={completedContentIds}
    />
  ) : undefined;

  return { weekly, sidebar };
}
