import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { useAuth } from '../contexts/useAuth';
import {
  ActivityStatus,
  CourseStatus,
  DailyStatus,
  ACTIVITY_TYPE_LABEL,
  type CourseDetailDto,
  type DailyStateDto,
  type GamificationSummaryDto,
  type WeeklyDetailDto,
} from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { GemBadge } from '../components/gamification/GemBadge';
import { StreakIndicator } from '../components/gamification/StreakIndicator';
import { StreakLostModal } from '../components/gamification/StreakLostModal';
import { StatusBadge } from '../components/StatusBadge';
import { dailyStatusBadgeProps } from '../lib/statusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WeeklyProjectCard } from '../components/WeeklyProjectCard';
import { WeeklyReinforcementBadge } from '../components/WeeklyReinforcementBadge';
import { EmptyStateStartPage } from './EmptyStateStartPage';

interface DashboardData {
  daily: DailyStateDto;
  weekly: WeeklyDetailDto;
  course: CourseDetailDto | null;
  gamification: GamificationSummaryDto;
}

/**
 * Hub de entrada (Fase 8, design Figma "dashboard-start") - substitui a antiga lista de cursos:
 * como so existe 1 Course Active nesta fase (mesma premissa de GET /api/today, ver
 * docs/ARQUITETURA.md), a tela vai direto pro "hoje" em vez de fazer o usuario escolher um curso
 * de uma lista de 1 item so. O cabecalho global (logo/nav) ja vem de App.tsx - nao duplicado aqui.
 *
 * Fase 14: Gems/Streak do mockup do Figma ganharam dado real (GemBadge/StreakIndicator no header,
 * via GET /api/users/me/gamification) - XP/Level/badges de conquista continuam de fora (nao
 * existem no dominio ainda, ver docs/fase-14).
 *
 * Fase 10 (retomada): "Erro - Streak Perdido" (node Figma 13-1040, nunca construida) dispara aqui,
 * no load, quando gamification.streakJustBroken vem true - StreakLostModal chama
 * api.acknowledgeStreakBreak ao fechar, pra nao repetir na proxima visita.
 *
 * Fase 20 (fidelidade revisada): "Olá, Falves" do mockup virou saudacao com o nome real
 * (useAuth().user.displayName - so nao era usado aqui ainda). "INDIE DEV" + foto de usuario no
 * header global nao sao tocados aqui (fora do escopo desta tela, ver App.tsx/HeaderUserBadge). O
 * grid "Seus Cursos" (1 ativo + 2 "bloqueados, libera no nivel X") do Figma continua fora - so
 * existe 1 Course Active (decisao da Fase 8, reafirmada) e nao ha sistema de nivel/desbloqueio
 * (mesma exclusao de XP/Level de sempre). Rodape "Sessões completadas: N" tambem fica de fora -
 * sem contador agregado de sessoes no dominio; "Melhor streak"/"Gems" do mockup sao reais
 * (GamificationSummaryDto) e ganharam a mesma linha discreta de rodape.
 */
export function StartDashboard() {
  const { user } = useAuth();
  const { data, error, loading, retry } = useApiResource<DashboardData>(
    () =>
      api.getToday().then(async (daily) => {
        const [weekly, courses, gamification] = await Promise.all([
          api.getWeekly(daily.weeklyId),
          api.getCourses(),
          api.getGamification(),
        ]);
        const activeSummary = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
        const course = activeSummary ? await api.getCourse(activeSummary.id) : null;
        return { daily, weekly, course, gamification };
      }),
    [],
  );

  // Derivado direto do fetch (nao um effect) - so precisa "lembrar" um dismiss local pra nao
  // reaparecer no mesmo carregamento depois que StreakLostModal ja chamou acknowledgeStreakBreak.
  const [dismissed, setDismissed] = useState(false);
  const streakLostVisible = !dismissed && !!data?.gamification.streakJustBroken;

  if (loading) return <Centered text="Carregando..." />;
  // Guarda de seguranca (Fase 13b) - usuario logado, perfil completo, mas sem nenhuma matricula
  // ainda (ver docs/fase-13a, "Consequencia direta"). SplashPage ja evita a maioria desses casos
  // via resolveLandingPath, mas /start continua acessivel direto pela URL/back-button.
  if (error?.code === 'nenhuma_matricula_ativa') return <EmptyStateStartPage />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  const { daily, weekly, course, gamification } = data;
  const weeks = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const weeksCompleted = weeks.filter((w) => w.totalDailies > 0 && w.completedDailies === w.totalDailies).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      {streakLostVisible && (
        <StreakLostModal longestStreak={gamification.longestStreak} onClose={() => setDismissed(true)} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[2px] text-muted">{course?.name ?? 'Focadu'}</p>
          <h1 className="mt-1 text-3xl font-bold text-primary">Olá, {user?.displayName ?? 'operador'} 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Fase 17: clicavel de proposito - "faz sentido clicar nele pra ir direto a loja". */}
          <Link to="/loja">
            <GemBadge totalGems={gamification.totalGems} />
          </Link>
          <StreakIndicator currentStreak={gamification.currentStreak} />
        </div>
      </div>

      {weekly.hasPendingWeeklyReinforcement && (
        <Link to={`/start?course=${course?.id ?? ''}&weekly=${weekly.id}`} className="self-start">
          <WeeklyReinforcementBadge />
        </Link>
      )}

      <TodayCard daily={daily} weekly={weekly} weeksTotal={weeks.length} weeksCompleted={weeksCompleted} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <WeeklyProjectCard project={weekly.project} weeklyId={weekly.id} courseId={course?.id ?? null} />
        <CourseExplorerLink courseId={course?.id ?? null} weeksTotal={weeks.length} weeksCompleted={weeksCompleted} />
      </div>

      {/* Fase 20 (Figma "Subtle Stats footer"): so os 2 numeros que ja existem de verdade
          (GamificationSummaryDto) - "Sessões completadas" do mockup nao tem contador agregado no
          dominio, omitido em vez de inventado. */}
      <div className="flex items-center gap-3 text-sm text-secondary">
        <span>
          Melhor streak: <span className="font-semibold text-primary">{gamification.longestStreak} dia(s)</span>
        </span>
        <span className="text-muted">|</span>
        <span>
          Gems: <span className="font-semibold text-primary">{gamification.totalGems}</span>
        </span>
      </div>
    </div>
  );
}

function TodayCard({
  daily,
  weekly,
  weeksTotal,
  weeksCompleted,
}: {
  daily: DailyStateDto;
  weekly: WeeklyDetailDto;
  weeksTotal: number;
  weeksCompleted: number;
}) {
  const totalDailies = weekly.dailies.filter((d) => !d.isReinforcement).length;
  const nextActivity = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex).find((a) => a.status !== ActivityStatus.Completed);
  const badge = dailyStatusBadgeProps(daily.status);

  return (
    <div className="flex flex-col gap-5 rounded-[20px] border-[1.5px] border-accent bg-surface p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[1.5px] text-accent">Curso Ativo</p>
          <h2 className="mt-1 text-2xl font-bold text-primary">{weekly.theme ?? weekly.title}</h2>
          <p className="mt-1 text-sm text-secondary">
            Dia {daily.dayNumber} de {totalDailies}
          </p>
        </div>
        <StatusBadge {...badge} />
      </div>

      {/* Fase 20 (Figma "Course Card Active"): "Semana X de Y ... Z% completo", real
          (weeksCompleted/weeksTotal, ja calculado pelo chamador). */}
      {weeksTotal > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-secondary">
              Semana {weeksCompleted + 1 <= weeksTotal ? weeksCompleted + 1 : weeksTotal} de {weeksTotal}
            </span>
            <span className="font-semibold text-accent">{Math.round((100 * weeksCompleted) / weeksTotal)}% completo</span>
          </div>
          <ProgressBar progress={weeksTotal ? weeksCompleted / weeksTotal : 0} />
        </div>
      )}

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
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-stroke bg-surface p-6">
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
