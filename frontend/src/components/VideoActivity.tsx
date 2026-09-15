import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { Centered } from './Layout';
import { ApiErrorScreen } from './errors/ApiErrorScreen';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';
import { extractYouTubeId } from '../lib/youtube';
import dotSmall from '../assets/reading/dot-small.svg';

/**
 * Etapa de video (design Figma "sessao-video", Fase 7 - fidelidade revisada na Fase 19) -
 * ActivityType.Video, ContentId obrigatorio. Embed real do YouTube (youtube-nocookie.com) a partir
 * de CuratedContent.ExternalUrl -
 * o design mostra um player estatico (mockup do Figma nao renderiza iframe), aqui vira o player de
 * verdade. `rel=0` + `modestbranding=1` reduz a interface/sugestoes do player ao minimo que a API
 * do YouTube permite - o embed moderno nao tem uma flag pra remover 100% dos videos recomendados no
 * fim (ponytail: teto conhecido da propria plataforma, sem solucao alternativa sem uma API paga).
 */
export function VideoActivity({
  dailyId,
  daily,
  activity,
  onDailyRefetched,
  onContinue,
  onBack,
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
  onBack?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: content,
    error: contentError,
    loading,
    retry,
  } = useApiResource(() => api.getCuratedContent(activity.contentId!), [activity.contentId]);
  const { weekly, materialSidebar, sidebar } = useMaterialSidebar(daily, activity.contentId);

  if (loading) return <Centered text="Carregando vídeo..." />;
  if (contentError) return <ApiErrorScreen error={contentError} onRetry={retry} />;
  if (!content) return null;

  // Fase 36: mesmo motivo de ReadingActivity - unico outro tipo sem indicador de "ja respondida".
  const alreadyCompleted = activity.responses.length > 0;

  async function handleComplete() {
    if (alreadyCompleted) {
      onContinue();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitActivityResponse(dailyId, activity.id, {});
      onDailyRefetched(await api.getDaily(dailyId));
      onContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível avançar. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const total = sortedActivities.length;

  const videoId = extractYouTubeId(content.externalUrl);

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — VÍDEO`}
      progress={(stepIndex + 1) / total}
      leftSidebar={materialSidebar}
      sidebar={sidebar}
      onBack={onBack}
      // Fase 32: mesma logica de ReadingActivity - da pro Suporte Rapido de IA o titulo/descricao
      // real do video (o transcript em si nao esta disponivel pro frontend, so o que a curadoria
      // registrou como descricao).
      assistantContext={`Vídeo: "${content.title}"${content.bodyText ? `\n\n${content.bodyText}` : ''}`}
    >
      {/* w-[90%] mx-auto (era w-full): encolhe a coluna inteira (badge/video/titulo/botao) ~10% a
          pedido - o video encolhe junto como consequencia, nao um ajuste isolado nele. */}
      <div className="mx-auto flex w-[90%] flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex w-fit items-center gap-2 rounded-full bg-surface-alt px-3 py-1.5">
            <img src={dotSmall} alt="" className="size-1.5" />
            <p className="text-[11px] font-medium tracking-[0.5px] text-secondary">MATERIAL: VÍDEO</p>
          </div>
          {alreadyCompleted && <span className="text-xs font-medium whitespace-nowrap text-accent">✓ Já assistido</span>}
        </div>

        <div className="aspect-video w-full overflow-hidden rounded-xl bg-base">
          {videoId ? (
            <iframe
              className="size-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`}
              title={content.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex size-full items-center justify-center px-6 text-center text-sm text-muted">
              Vídeo ainda não definido para este dia.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xl font-semibold text-primary">{content.title}</p>
          {content.bodyText && <p className="text-sm leading-[1.5] text-secondary">{content.bodyText}</p>}
        </div>

        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="rounded-xl bg-accent py-4 text-center text-sm font-semibold tracking-[1px] text-base disabled:opacity-40"
          >
            {alreadyCompleted ? 'PRÓXIMA ETAPA' : submitting ? 'ENVIANDO...' : 'ASSISTIDO — PRÓXIMA ETAPA'}
          </button>
        </div>
      </div>
    </SessionLayout>
  );
}
