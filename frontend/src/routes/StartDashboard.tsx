import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { useAuth } from '../contexts/useAuth';
import {
  ActivityStatus,
  CourseStatus,
  DailyAccessMode,
  DailyStatus,
  ACTIVITY_TYPE_LABEL,
  type CourseDetailDto,
  type DailyStateDto,
  type GamificationSummaryDto,
  type WeeklyDetailDto,
} from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { CourseCarousel } from '../components/CourseCarousel';
import { GemBadge } from '../components/gamification/GemBadge';
import { StreakIndicator } from '../components/gamification/StreakIndicator';
import { StreakLostModal } from '../components/gamification/StreakLostModal';
import { StatusBadge } from '../components/StatusBadge';
import { dailyStatusBadgeProps } from '../lib/statusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WeeklyProjectCard } from '../components/WeeklyProjectCard';
import { WeeklyReinforcementBadge } from '../components/WeeklyReinforcementBadge';
import { EmptyStateStartPage } from './EmptyStateStartPage';
import { isMonthlyComplete } from '../lib/certifications';

interface DashboardData {
  daily: DailyStateDto;
  weekly: WeeklyDetailDto;
  course: CourseDetailDto | null;
  /** Fase 38c: todos os cursos matriculados (nao so o ativo) - alimenta o CourseCarousel. */
  allCourses: CourseDetailDto[];
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
 * grid "Seus Cursos" (1 ativo + 2 "bloqueados, libera no nivel X") do Figma continua fora - nao ha
 * sistema de nivel/desbloqueio (mesma exclusao de XP/Level de sempre).
 *
 * Fase 38c: o label de texto puro acima do nome ("WEB SECURITY", um <p> discreto) virou
 * CourseCarousel - card visual arrastavel por curso matriculado (so 1 na pratica, ver doc do
 * componente). O rodape "Melhor streak"/"Gems" em texto simples saiu - duplicava informacao que
 * ja aparece no header (GemBadge/StreakIndicator, mesmos dados) desde a Fase 14; ter as duas
 * versoes juntas na tela (pixel art em cima, texto embaixo) foi reportado como redundante.
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
        // Fase 38c: busca o detalhe de TODOS os cursos matriculados (nao so o ativo) - precisa do
        // CourseProgressDto de cada um pra alimentar o CourseCarousel. N+1 aceitavel (poucos
        // cursos por usuario nesta fase, ver docs/ARQUITETURA.md).
        const allCourses = await Promise.all(courses.map((c) => api.getCourse(c.id)));
        const activeSummary = courses.find((c) => c.status === CourseStatus.Active) ?? courses[0] ?? null;
        const course = allCourses.find((c) => c.id === activeSummary?.id) ?? allCourses[0] ?? null;
        return { daily, weekly, course, allCourses, gamification };
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

  const { daily, weekly, course, allCourses, gamification } = data;
  const weeks = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const weeksCompleted = weeks.filter((w) => w.totalDailies > 0 && w.completedDailies === w.totalDailies).length;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      {streakLostVisible && (
        <StreakLostModal longestStreak={gamification.longestStreak} onClose={() => setDismissed(true)} />
      )}

      <CourseCarousel courses={allCourses} activeCourseId={course?.id ?? null} />

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">Olá, {user?.displayName ?? 'operador'} 👋</h1>
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
        <CertificationsSummaryCard course={course} className="md:col-span-2" />
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
  // Fase 38a: accessMode.Blocked vence Status - sem isso o badge mostrava "Não iniciado" (o
  // default de dailyStatusBadgeProps pra Status Locked/Available) bem ao lado do aviso "você já
  // concluiu uma sessão hoje" logo abaixo, se contradizendo (bug reportado ao vivo, 14/09/2026).
  //
  // Fase 54: WeekPendingClosure = todas as Dailies da semana feitas, falta fechar a semana
  // (projeto, depois publicacao) pra liberar a proxima - "/hoje" devolve a ultima Daily da Weekly
  // que ainda nao fechou, entao `weekly` aqui ja e ela (e o card do projeto logo abaixo tambem).
  const closurePending = daily.accessMode === DailyAccessMode.WeekPendingClosure;
  const sessionBlocked = closurePending || daily.accessMode === DailyAccessMode.Blocked;
  const badge = closurePending
    ? { icon: '🔒', label: weekly.requiresPublicationToUnlock ? 'PUBLICAÇÃO PENDENTE' : 'PROJETO PENDENTE', tone: 'alert' as const }
    : daily.accessMode === DailyAccessMode.Blocked
      ? { icon: '🔒', label: 'BLOQUEADO ATÉ AMANHÃ', tone: 'alert' as const }
      : dailyStatusBadgeProps(daily.status);
  // Fora de closurePending, "Semana X" e a primeira ainda nao completa (weeksCompleted + 1); em
  // closurePending a semana em foco ja tem todas as Dailies feitas, entao contar +1 mostraria
  // "Semana 2" ao lado de "Dia 5 de 5" da Semana 1.
  const currentWeekNumber = closurePending
    ? weekly.number
    : weeksCompleted + 1 <= weeksTotal
      ? weeksCompleted + 1
      : weeksTotal;

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
              Semana {currentWeekNumber} de {weeksTotal}
            </span>
            <span className="font-semibold text-accent">{Math.round((100 * weeksCompleted) / weeksTotal)}% completo</span>
          </div>
          <ProgressBar progress={weeksTotal ? weeksCompleted / weeksTotal : 0} />
        </div>
      )}

      {nextActivity && !sessionBlocked && (
        <p className="text-sm text-secondary">
          Próximo: <span className="font-semibold text-primary">{ACTIVITY_TYPE_LABEL[nextActivity.type]}</span>
        </p>
      )}

      {/* DailyAccessMode.Blocked (Fase 37b): usuario ja gastou a unica conclusao permitida hoje
          (mesmo que retomando um atraso de outro dia - ver Weekly.EvaluateDailyAccess) - a Daily
          de hoje existe mas ainda nao pode ser iniciada, entao nada aqui deve convidar a clicar
          "COMEÇAR HOJE" (isso so voltaria a mostrar esse mesmo aviso em /hoje). */}
      {closurePending ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-secondary">
            {weekly.requiresPublicationToUnlock
              ? 'Você concluiu todas as sessões desta semana. Falta validar a publicação para liberar a próxima semana.'
              : 'Você concluiu todas as sessões desta semana. Envie o projeto semanal para liberar a próxima semana.'}
          </p>
          <Link to={`/start?weekly=${weekly.id}`} className="rounded-xl bg-accent px-6 py-3 text-sm font-bold tracking-wide text-base">
            VER A SEMANA
          </Link>
        </div>
      ) : daily.accessMode === DailyAccessMode.Blocked ? (
        <p className="text-sm text-secondary">Você já concluiu uma sessão hoje - volte amanhã para continuar.</p>
      ) : (
        <Link to="/hoje" className="self-start rounded-xl bg-accent px-6 py-3 text-sm font-bold tracking-wide text-base">
          {daily.status === DailyStatus.Completed ? 'REVISAR HOJE' : 'COMEÇAR HOJE'}
        </Link>
      )}
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

/**
 * Fase 45: resumo de quantas certificações de mercado o curso ativo já cobre/está cobrindo,
 * informativo (a Focadu não emite certificação nenhuma). Reaproveita CourseDetailDto já carregado
 * por StartDashboard - sem endpoint novo.
 */
function CertificationsSummaryCard({ course, className = '' }: { course: CourseDetailDto | null; className?: string }) {
  const monthlies = course?.monthlies ?? [];
  const allCertCodes = new Set(monthlies.flatMap((m) => m.certifications.map((c) => c.certificationCode)));
  const unlockedCertCodes = new Set(
    monthlies.filter(isMonthlyComplete).flatMap((m) => m.certifications.map((c) => c.certificationCode)),
  );

  if (allCertCodes.size === 0) return null;

  return (
    <div className={`flex flex-col justify-between gap-4 rounded-2xl border border-stroke bg-surface p-6 ${className}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Certificações de Mercado</p>
        <p className="mt-1 text-sm text-secondary">
          Você já avançou em {unlockedCertCodes.size} de {allCertCodes.size} certificação(ões) mapeada(s) neste curso
        </p>
      </div>
      {course && (
        <Link
          to={`/start?course=${course.id}&certifications=1`}
          className="self-start text-sm font-semibold text-accent hover:underline"
        >
          Ver Certificações →
        </Link>
      )}
    </div>
  );
}
