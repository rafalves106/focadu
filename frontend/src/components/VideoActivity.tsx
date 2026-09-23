import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { SessionFooter, SessionLayout } from './SessionShell';
import { PixelButton } from './session/PixelButton';
import { extractYouTubeId } from '../lib/youtube';

/**
 * Etapa de video (ActivityType.Video, ContentId obrigatorio). Embed real do YouTube
 * (youtube-nocookie.com, `rel=0` + `modestbranding=1` - o minimo de sugestoes que a API permite).
 *
 * Fase 68 (Figma "Daily — 05"): o player ocupa o cartao da casca e o "Assisti" fica no rodape fixo.
 */
export function VideoActivity({
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: content, error: contentError, loading, retry } = useApiResource(
    () => api.getCuratedContent(activity.contentId!),
    [activity.contentId],
  );

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

  if (loading || contentError || !content) {
    return (
      <SessionLayout>
        {loading ? (
          <p className="font-pixel text-xl text-secondary">Carregando vídeo...</p>
        ) : (
          <>
            <p className="font-pixel text-lg leading-tight text-alert">{contentError?.message ?? 'Vídeo não encontrado.'}</p>
            <SessionFooter>
              <PixelButton ghost onClick={retry}>
                Tentar de novo
              </PixelButton>
            </SessionFooter>
          </>
        )}
      </SessionLayout>
    );
  }

  const videoId = extractYouTubeId(content.externalUrl);

  return (
    <SessionLayout assistantContext={`Vídeo: "${content.title}"${content.bodyText ? `\n\n${content.bodyText}` : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-pixel text-[32px] leading-none text-primary">{content.title}</h2>
        {alreadyCompleted && <span className="mt-1.5 shrink-0 font-pixel-label text-[9px] text-accent">✓ Assistido</span>}
      </div>

      <div className="aspect-video w-full overflow-hidden border-2 border-stroke bg-surface-alt">
        {videoId ? (
          <iframe
            className="size-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`}
            title={content.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="flex size-full items-center justify-center px-6 text-center font-pixel text-lg text-muted">Vídeo ainda não definido para este dia.</div>
        )}
      </div>

      {content.bodyText && <p className="font-pixel text-lg leading-tight text-secondary">{content.bodyText}</p>}
      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      <SessionFooter>
        {!alreadyCompleted && <p className="font-pixel-label text-[8px] text-muted">Assista até o fim pra seguir</p>}
        <PixelButton onClick={handleComplete} disabled={submitting}>
          {alreadyCompleted ? 'Próxima etapa ›' : submitting ? 'Enviando...' : 'Assisti ›'}
        </PixelButton>
      </SessionFooter>
    </SessionLayout>
  );
}
