import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { ActivityStatus, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { Centered } from './Layout';
import { SessionTopBar, QuickQuestionOrb } from './SessionShell';
import { MaterialSidebar } from './MaterialSidebar';
import dotSmall from '../assets/reading/dot-small.svg';

/**
 * Etapa de leitura (design Figma "sessao-leitura", Fase 7) - ActivityType.Reading, ContentId
 * obrigatorio (ver DailyActivity.ctor). Concluir so registra uma ActivityResponse com Score fixo
 * (backend, ver SubmitActivityResponseUseCase.ResolveScore) - sem revelar gabarito nem feedback,
 * por isso nao usa FeedbackPanel: e so avanca direto (onContinue), como o design pede.
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

  const { data: content, error: contentError, loading } = useApiResource(
    () => api.getCuratedContent(activity.contentId!),
    [activity.contentId],
  );
  const { data: weekly } = useApiResource(() => api.getWeekly(daily.weeklyId), [daily.weeklyId]);

  if (loading) return <Centered text="Carregando leitura..." />;
  if (contentError) return <Centered text={contentError} tone="alert" />;
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
  const completedContentIds = new Set(
    daily.activities.filter((a) => a.status === ActivityStatus.Completed && a.contentId).map((a) => a.contentId!),
  );
  // "Material de hoje" = so o conteudo referenciado pelas atividades DESTA Daily - weekly.curatedContents
  // traz os 4 dias juntos (CuratedContent nao tem DailyId, so pertence a Weekly), sem esse filtro o
  // sidebar mostraria a semana inteira.
  const todaysContentIds = new Set(daily.activities.filter((a) => a.contentId).map((a) => a.contentId!));

  const sourceHost = content.externalUrl
    ? new URL(content.externalUrl).hostname.replace(/^www\./, '').toUpperCase()
    : null;
  const wordCount = content.bodyText?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const readMinutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : null;

  return (
    <div className="min-h-screen bg-base p-10">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-8">
        <SessionTopBar
          eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
          stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — LEITURA`}
          progress={(stepIndex + 1) / total}
        />

        <div className="flex items-start gap-8">
          <div className="flex max-h-[680px] w-full flex-col gap-5 rounded-2xl border border-surface-alt bg-surface px-10 pt-8 pb-7">
            {sourceHost && (
              <div className="flex w-fit items-center gap-2 rounded-full bg-surface-alt px-3 py-1.5">
                <img src={dotSmall} alt="" className="size-1.5" />
                <p className="text-[11px] font-medium tracking-[0.5px] text-secondary">FONTE: {sourceHost}</p>
              </div>
            )}
            <h1 className="text-2xl font-semibold leading-snug text-primary">{content.title}</h1>

            <div className="relative min-h-0 flex-1 overflow-y-auto pr-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-secondary">
                {content.bodyText ?? 'Conteúdo ainda não cadastrado.'}
              </p>
              <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-b from-transparent to-surface" />
            </div>

            <div className="flex flex-col gap-3">
              {error && <p className="text-sm text-alert">{error}</p>}
              {readMinutes && (
                <p className="text-center text-xs font-medium text-muted">~{readMinutes} min de leitura estimada</p>
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

          {weekly && (
            <MaterialSidebar
              contents={weekly.curatedContents.filter((c) => todaysContentIds.has(c.id))}
              activeContentId={content.id}
              completedContentIds={completedContentIds}
            />
          )}
        </div>
      </div>

      <QuickQuestionOrb />
    </div>
  );
}
