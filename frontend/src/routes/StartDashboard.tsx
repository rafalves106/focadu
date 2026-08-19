import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import {
  ActivityStatus,
  CourseStatus,
  DailyStatus,
  ACTIVITY_TYPE_LABEL,
  type CourseDetailDto,
  type DailyStateDto,
  type WeeklyDetailDto,
} from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { StatusBadge } from '../components/StatusBadge';
import { dailyStatusBadgeProps } from '../lib/statusBadge';
import { WeeklyProjectCard } from '../components/WeeklyProjectCard';

interface DashboardData {
  daily: DailyStateDto;
  weekly: WeeklyDetailDto;
  course: CourseDetailDto | null;
}

/**
 * Hub de entrada (Fase 8, design Figma "dashboard-start") - substitui a antiga lista de cursos:
 * como so existe 1 Course Active nesta fase (mesma premissa de GET /api/today, ver
 * docs/ARQUITETURA.md), a tela vai direto pro "hoje" em vez de fazer o usuario escolher um curso
 * de uma lista de 1 item so. O cabecalho global (logo/nav) ja vem de App.tsx - nao duplicado aqui.
 *
 * Gems/XP/streak/niveis do mockup do Figma nao existem no dominio (sistema em standby desde a
 * Fase 6/7) - os cards abaixo so mostram numeros reais (dia da semana, status, progresso do curso).
 */
export function StartDashboard() {
  const { data, error, loading, retry } = useApiResource<DashboardData>(
    () =>
      api.getToday().then(async (daily) => {
        const [weekly, courses] = await Promise.all([api.getWeekly(daily.weeklyId), api.getCourses()]);
        const activeSummary = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
        const course = activeSummary ? await api.getCourse(activeSummary.id) : null;
        return { daily, weekly, course };
      }),
    [],
  );

  if (loading) return <Centered text="Carregando..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  const { daily, weekly, course } = data;
  const weeks = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const weeksCompleted = weeks.filter((w) => w.totalDailies > 0 && w.completedDailies === w.totalDailies).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[2px] text-muted">{course?.name ?? 'Focadu'}</p>
        <h1 className="mt-1 text-3xl font-bold text-primary">Olá! 👋</h1>
      </div>

      <TodayCard daily={daily} weekly={weekly} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <WeeklyProjectCard project={weekly.project} weeklyId={weekly.id} courseId={course?.id ?? null} />
        <CourseExplorerLink courseId={course?.id ?? null} weeksTotal={weeks.length} weeksCompleted={weeksCompleted} />
      </div>
    </div>
  );
}

function TodayCard({ daily, weekly }: { daily: DailyStateDto; weekly: WeeklyDetailDto }) {
  const totalDailies = weekly.dailies.filter((d) => !d.isReinforcement).length;
  const nextActivity = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex).find((a) => a.status !== ActivityStatus.Completed);
  const badge = dailyStatusBadgeProps(daily.status);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border-[1.5px] border-accent bg-surface p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Começar Hoje</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">{weekly.theme ?? weekly.title}</h2>
          <p className="mt-1 text-sm text-secondary">
            Dia {daily.dayNumber} de {totalDailies}
          </p>
        </div>
        <StatusBadge {...badge} />
      </div>

      {nextActivity && (
        <p className="text-sm text-secondary">
          Próximo: <span className="font-semibold text-primary">{ACTIVITY_TYPE_LABEL[nextActivity.type]}</span>
        </p>
      )}

      <Link to="/hoje" className="self-start rounded-xl bg-accent px-6 py-3 text-sm font-bold tracking-wide text-base">
        {daily.status === DailyStatus.Completed ? 'REVISAR HOJE' : 'COMEÇAR HOJE'}
      </Link>
    </div>
  );
}

function CourseExplorerLink({
  courseId,
  weeksTotal,
  weeksCompleted,
}: {
  courseId: string | null;
  weeksTotal: number;
  weeksCompleted: number;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-surface-alt bg-surface p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Trilha Completa</p>
        <p className="mt-1 text-sm text-secondary">
          {weeksCompleted} de {weeksTotal} semana(s) completa(s)
        </p>
      </div>
      {courseId && (
        <Link to={`/start?course=${courseId}`} className="self-start text-sm font-semibold text-accent hover:underline">
          Explorar Curso Completo →
        </Link>
      )}
    </div>
  );
}
