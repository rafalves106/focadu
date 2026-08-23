import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { Centered } from './Layout';
import { ApiErrorScreen } from './errors/ApiErrorScreen';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';
import dotSmall from '../assets/reading/dot-small.svg';

/**
 * Etapa de leitura (design Figma "sessao-leitura", Fase 7 - fidelidade revisada na Fase 19) -
 * ActivityType.Reading, ContentId obrigatorio (ver DailyActivity.ctor). Concluir so registra uma
 * ActivityResponse com Score fixo (backend, ver SubmitActivityResponseUseCase.ResolveScore) - sem
 * revelar gabarito nem feedback, por isso nao usa FeedbackPanel: e so avanca direto (onContinue),
 * como o design pede. Chrome (SessionLayout) generalizado na Fase 19 - antes era JSX proprio.
 */
export function ReadingActivity({
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

  if (loading) return <Centered text="Carregando leitura..." />;
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
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a leitura. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const total = sortedActivities.length;

  const sourceHost = content.externalUrl
    ? new URL(content.externalUrl).hostname.replace(/^www\./, '').toUpperCase()
    : null;
  const wordCount = content.bodyText?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const readMinutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : null;

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — LEITURA`}
      progress={(stepIndex + 1) / total}
      sidebar={sidebar}
    >
      <div className="flex max-h-[620px] w-full flex-col gap-5">
        {sourceHost && (
          <div className="flex w-fit items-center gap-2 rounded-full bg-surface-alt px-3 py-1.5">
            <img src={dotSmall} alt="" className="size-1.5" />
            <p className="text-[11px] font-medium tracking-[0.5px] text-secondary">FONTE: {sourceHost}</p>
          </div>
        )}
        <h1 className="text-2xl font-semibold leading-[1.3] text-primary">{content.title}</h1>

        <div className="relative min-h-0 flex-1 overflow-y-auto pr-3">
          <p className="whitespace-pre-line text-sm leading-[1.5] text-secondary">
            {content.bodyText ?? 'Conteúdo ainda não cadastrado.'}
          </p>
          <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-b from-transparent to-surface" />
        </div>

        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-alert">{error}</p>}
          {readMinutes && (
            <p className="text-center text-xs font-medium text-muted">⏱ ~{readMinutes} min de leitura estimada</p>
          )}
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="rounded-xl bg-accent py-4 text-center text-sm font-semibold tracking-[1px] text-base disabled:opacity-40"
          >
            {submitting ? 'ENVIANDO...' : 'CONCLUÍ A LEITURA'}
          </button>
        </div>
      </div>
    </SessionLayout>
  );
}
