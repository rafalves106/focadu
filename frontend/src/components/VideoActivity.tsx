import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { Centered } from './Layout';
import { ApiErrorScreen } from './errors/ApiErrorScreen';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';
import dotSmall from '../assets/reading/dot-small.svg';

/** youtube.com/watch?v=ID ou youtu.be/ID -> ID do video, ou null se o link nao for reconhecido/estiver ausente. */
function extractYouTubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1) || null;
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

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
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    data: content,
    error: contentError,
    loading,
    retry,
  } = useApiResource(() => api.getCuratedContent(activity.contentId!), [activity.contentId]);
  const { weekly, sidebar } = useMaterialSidebar(daily, activity.contentId);

  if (loading) return <Centered text="Carregando vídeo..." />;
  if (contentError) return <ApiErrorScreen error={contentError} onRetry={retry} />;
  if (!content) return null;

  async function handleComplete() {
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
      sidebar={sidebar}
    >
      <div className="flex w-full flex-col gap-5">
        <div className="flex w-fit items-center gap-2 rounded-full bg-surface-alt px-3 py-1.5">
          <img src={dotSmall} alt="" className="size-1.5" />
          <p className="text-[11px] font-medium tracking-[0.5px] text-secondary">MATERIAL: VÍDEO</p>
        </div>

        <div className="h-[280px] w-full overflow-hidden rounded-xl bg-base">
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
            {submitting ? 'ENVIANDO...' : 'ASSISTIDO — PRÓXIMA ETAPA'}
          </button>
        </div>
      </div>
    </SessionLayout>
  );
}
