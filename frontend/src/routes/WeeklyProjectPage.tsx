import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { WeeklyProjectStatus } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { SessionTopBar, QuickQuestionOrb } from '../components/SessionShell';

const STATUS_BADGE: Record<number, { label: string; className: string }> = {
  [WeeklyProjectStatus.Pending]: { label: 'PENDENTE', className: 'bg-surface-alt text-alert' },
  [WeeklyProjectStatus.Submitted]: { label: 'AGUARDANDO AVALIAÇÃO', className: 'bg-surface-alt text-project' },
  [WeeklyProjectStatus.Evaluated]: { label: 'AVALIADO', className: 'bg-surface-alt text-accent' },
};

// Progresso do topo e derivado do Status (sem campo de deadline no dominio - WeeklyProject so tem
// SpecText/Status/SubmissionUrl, ver Focadu.Domain.Weeklies.WeeklyProject) - nao ha "% concluido"
// real alem disso.
const STATUS_PROGRESS: Record<number, number> = {
  [WeeklyProjectStatus.Pending]: 1 / 3,
  [WeeklyProjectStatus.Submitted]: 2 / 3,
  [WeeklyProjectStatus.Evaluated]: 1,
};

/**
 * Projeto semanal (design Figma "projeto-semanal", Fase 7) - WeeklyProject existe no dominio desde
 * a Fase 1 (SpecText/Status/SubmissionUrl) mas nunca teve tela. O mock do Figma mostra
 * titulo/objetivos/recursos como campos separados; o dominio so guarda 1 texto livre (SpecText,
 * ver seed) - por isso aqui SpecText vira o corpo do card inteiro, sem inventar uma estrutura que
 * a Api nao tem.
 */
export function WeeklyProjectPage({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const { data: weekly, error, loading, retry } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId]);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) return <Centered text="Carregando projeto..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const backTo = `/start?course=${courseId ?? ''}&weekly=${weeklyId}`;
  if (!weekly.project) {
    return <Centered text="Esta semana ainda não tem projeto definido." />;
  }

  const project = weekly.project;
  const badge = STATUS_BADGE[project.status];
  const canSubmit = project.status !== WeeklyProjectStatus.Evaluated;

  async function handleSubmit() {
    if (!submissionUrl.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitWeeklyProject(weeklyId, submissionUrl.trim());
      window.location.reload(); // mais simples que replicar o refetch aqui - so essa tela usa este caso de uso.
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível enviar. Tente de novo.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-base p-10">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-8">
        <SessionTopBar
          eyebrow={
            <Link to={backTo} className="hover:text-secondary">
              &larr; {(weekly.theme ?? weekly.title).toUpperCase()}
            </Link>
          }
          stepLabel={`PROJETO SEMANAL — SEMANA ${weekly.number}`}
          progress={STATUS_PROGRESS[project.status]}
          tone="project"
        />

        <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 rounded-[20px] border-[1.5px] border-project bg-surface p-10">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-project bg-project/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.5px] text-project">
              CHEFE DE FASE 👾
            </span>
            <span className={`rounded-md px-3 py-1.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-bold text-primary">Projeto da Semana {weekly.number}</h1>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-secondary">{project.specText}</p>
          </div>

          <div className="h-px bg-surface-alt" />

          {project.submissionUrl && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sua submissão</p>
              <a href={project.submissionUrl} target="_blank" rel="noreferrer" className="w-fit text-sm text-accent hover:underline">
                {project.submissionUrl}
              </a>
            </div>
          )}

          {canSubmit && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-secondary">
                  Cole a URL da sua submissão (repositório GitHub, post no LinkedIn, etc.)
                </span>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="rounded-xl border border-surface-alt bg-surface-alt px-4 py-3 text-primary outline-none focus:border-project"
                />
              </label>

              {submitError && <p className="text-sm text-alert">{submitError}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!submissionUrl.trim() || submitting}
                className="self-end rounded-xl bg-project px-8 py-4 text-sm font-bold text-base disabled:opacity-40"
              >
                {submitting ? 'ENVIANDO...' : 'ENTREGAR PROJETO'}
              </button>
            </div>
          )}
        </div>
      </div>

      <QuickQuestionOrb />
    </div>
  );
}
