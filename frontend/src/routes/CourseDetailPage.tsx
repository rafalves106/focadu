import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus, type DailyStatusSummaryDto, type WeeklyOverviewDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { EmptyStateError } from '../components/errors/EmptyStateError';
import { dailyStatusBadgeProps } from '../lib/statusBadge';
import { ProgressBar } from '../components/ProgressBar';

const DAY_MINI_TONE: Record<number, string> = {
  0: 'border-transparent bg-surface-alt text-muted', // Locked
  1: 'border-transparent bg-surface-alt text-muted', // Available
  2: 'border-accent bg-accent/10 text-accent', // InProgress
  3: 'border-accent/40 bg-accent/20 text-accent', // Completed
};

/**
 * Detalhes do Curso (Fase 8, design Figma "Detalhes do Curso") - trilha completa via GET
 * /api/courses/{courseId} (CourseDetailDto ja existia desde a Fase 2; so o mini-grid por dia
 * (WeeklyOverviewDto.Days) e novo, ver GetCourseDetailUseCase). Nenhum endpoint novo.
 *
 * O mockup mostra "96 sub-aulas"/"4.800 XP"/pre-requisitos/curadoria - nenhum desses campos
 * existe no dominio (Course so tem Name/Status; XP/Gems seguem em standby, ver
 * docs/ARQUITETURA.md) - o resumo lateral mostra so numeros reais (dailies, reforcos).
 */
export function CourseDetailPage({ courseId }: { courseId: string }) {
  const { data: course, error, loading, retry } = useApiResource(() => api.getCourse(courseId), [courseId]);

  if (loading) return <Centered text="Carregando curso..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!course) return null;

  const weeks = course.monthlies.flatMap((m) => m.weeklies);
  const reinforcementCount = course.dailyReinforcements.length + course.weeklyReinforcements.length;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-8 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-surface-alt bg-surface p-8">
          <div className="flex items-center gap-2 text-xs">
            {course.status === CourseStatus.Active && (
              <span className="rounded-full border border-accent bg-accent/10 px-2.5 py-1 font-semibold text-accent">CURSO ATIVO</span>
            )}
            <span className="text-secondary">
              • {weeks.length} semana{weeks.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-primary">{course.name}</h1>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Progresso do treinamento</span>
              <span className="font-bold text-accent">{course.progress.completionPercentage}% completo</span>
            </div>
            <ProgressBar progress={course.progress.completionPercentage / 100} heightClass="h-2" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold uppercase tracking-wide text-muted">Conteúdo Programático</p>
          <div className="flex flex-col gap-3">
            {weeks.map((weekly) => (
              <WeekSummaryCard key={weekly.id} weekly={weekly} courseId={courseId} />
            ))}
          </div>
          {weeks.length === 0 && (
            <EmptyStateError title="Nenhuma semana cadastrada" description="Este curso ainda não tem semanas cadastradas." />
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-6 rounded-2xl border border-surface-alt bg-surface p-8 lg:w-[340px]">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">// Resumo do Curso</p>
        <div className="flex flex-col gap-3 text-sm">
          <Stat label="Dailies completas" value={`${course.progress.completedDailies} de ${course.progress.totalDailies}`} />
          <Stat label="Conclusão" value={`${course.progress.completionPercentage}%`} />
          <Stat label="Sessões de reforço" value={`${reinforcementCount}`} />
        </div>
        <Link to="/hoje" className="mt-auto block rounded-xl bg-accent py-3 text-center text-sm font-bold tracking-wide text-base">
          CONTINUAR ESTUDANDO
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-surface-alt pt-3 first:border-t-0 first:pt-0">
      <span className="text-secondary">{label}</span>
      <span className="font-mono font-bold text-primary">{value}</span>
    </div>
  );
}

function WeekSummaryCard({ weekly, courseId }: { weekly: WeeklyOverviewDto; courseId: string }) {
  const isComplete = weekly.totalDailies > 0 && weekly.completedDailies === weekly.totalDailies;
  const primaryDays = weekly.days.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);

  return (
    <Link
      to={`/start?course=${courseId}&weekly=${weekly.id}`}
      className={`block rounded-xl border-[1.5px] bg-surface p-5 hover:border-accent ${isComplete ? 'border-surface-alt' : 'border-accent'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true">{isComplete ? '✅' : '▶️'}</span>
          <p className="font-bold text-primary">
            Semana {weekly.number}: {weekly.theme ?? weekly.title}
          </p>
        </div>
        <span className="text-sm text-secondary">
          {weekly.completedDailies} de {weekly.totalDailies} dias
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {primaryDays.map((day) => (
          <DayMiniCard key={day.id} day={day} />
        ))}
        {weekly.hasWeeklyReinforcement && <span className="ml-2 text-xs text-alert">+ reforço</span>}
      </div>
    </Link>
  );
}

function DayMiniCard({ day }: { day: DailyStatusSummaryDto }) {
  const badge = dailyStatusBadgeProps(day.status);

  return (
    <div
      title={`Dia ${day.dayNumber} - ${badge.label}`}
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${DAY_MINI_TONE[day.status]}`}
    >
      {day.dayNumber}
    </div>
  );
}
