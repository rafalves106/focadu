import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { DailyStatus, type DailyOverviewDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { StatusBadge } from '../components/StatusBadge';
import { dailyStatusBadgeProps } from '../lib/statusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { WeeklyProjectCard } from '../components/WeeklyProjectCard';
import { PublicationModal } from '../components/publication/PublicationModal';

const WEEKDAY_LABEL = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function weekdayLabel(dateIso: string) {
  return WEEKDAY_LABEL[new Date(`${dateIso}T00:00:00`).getDay()];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Visao Semanal (Fase 8, design Figma "visao-semanal") - os dias da semana em lista + card do
 * projeto + navegacao entre semanas. Reaproveita GET /api/weeklies/{id} (WeeklyDetailDto ja tem
 * tudo: Dailies com Status/PenaltyPoints/IsWeakDay/atividades, Project) - nenhum endpoint novo.
 *
 * O mockup mostra titulo por dia (ex: "SQL Injection") e nota (ex: "92/100") que o dominio nao
 * tem (Daily nao tem titulo proprio, so Weekly tem Theme; nao ha nota media por dia) - o rotulo do
 * dia dia mostra a sigla real do dia da semana (derivada de Daily.Date) e "{aprovadas}/{total}
 * atividades" em vez de uma nota inventada.
 */
export function WeeklyDetailPage({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const { data: weekly, error, loading, retry } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId]);
  // So pra breadcrumb + navegacao entre semanas - se nao tiver courseId na URL, essas partes somem sem quebrar a tela.
  const { data: course } = useApiResource(() => (courseId ? api.getCourse(courseId) : Promise.resolve(null)), [courseId]);
  const [showPublicationModal, setShowPublicationModal] = useState(false);

  if (loading) return <Centered text="Carregando semana..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const today = todayIso();
  const days = weekly.dailies.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);
  const daysCompleted = days.filter((d) => d.status === DailyStatus.Completed).length;
  const penaltyPoints = days.reduce((sum, d) => sum + d.penaltyPoints, 0);
  const totalActivities = days.reduce((sum, d) => sum + d.totalActivities, 0);
  const passedActivities = days.reduce((sum, d) => sum + d.passedActivities, 0);
  const approvalRate = totalActivities > 0 ? Math.round((100 * passedActivities) / totalActivities) : null;
  const hasWeakDay = days.some((d) => d.isWeakDay);

  const allWeeks = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const weekIndex = allWeeks.findIndex((w) => w.id === weeklyId);
  const prevWeek = weekIndex > 0 ? allWeeks[weekIndex - 1] : null;
  const nextWeek = weekIndex >= 0 && weekIndex < allWeeks.length - 1 ? allWeeks[weekIndex + 1] : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Link to="/start" className="text-accent hover:underline">
            INÍCIO
          </Link>
          {course && (
            <>
              <span className="text-muted">/</span>
              <span className="uppercase text-secondary">{course.name}</span>
            </>
          )}
        </div>
        <h1 className="text-3xl font-bold text-primary">
          Semana {weekly.number}
          {allWeeks.length > 0 ? ` de ${allWeeks.length}` : ''}
        </h1>
        {weekly.theme && <p className="text-secondary">{weekly.theme}</p>}
      </div>

      {weekly.requiresPublicationToUnlock && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-project/40 bg-project/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-primary">🔒 Publique sua conclusão para liberar a próxima semana</p>
            <p className="text-sm text-secondary">
              Você completou os dias e o projeto desta semana. Publique uma prova no LinkedIn ou GitHub para continuar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPublicationModal(true)}
            className="shrink-0 rounded-xl bg-project px-4 py-2 text-sm font-semibold text-base hover:opacity-90"
          >
            Publicar agora
          </button>
        </div>
      )}

      {(prevWeek || nextWeek) && (
        <div className="flex items-center justify-between text-sm">
          {prevWeek ? (
            <Link to={`/start?course=${courseId}&weekly=${prevWeek.id}`} className="text-secondary hover:text-accent">
              ← Semana {prevWeek.number}
            </Link>
          ) : (
            <span />
          )}
          {nextWeek ? (
            <Link to={`/start?course=${courseId}&weekly=${nextWeek.id}`} className="text-secondary hover:text-accent">
              Semana {nextWeek.number} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-3">
          {days.map((day) => (
            <DayCard key={day.id} day={day} isFuture={day.date > today} isToday={day.date === today} />
          ))}
          <WeeklyProjectCard project={weekly.project} weeklyId={weeklyId} courseId={courseId} />
        </div>

        <div className="flex w-full flex-col gap-5 rounded-2xl border border-surface-alt bg-surface p-6 lg:w-[360px]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Resumo da Semana</p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">Progresso de Dias</span>
              <span className="font-semibold text-primary">
                {daysCompleted} / {days.length} dias
              </span>
            </div>
            <ProgressBar progress={days.length ? daysCompleted / days.length : 0} />
          </div>

          {penaltyPoints > 0 && (
            <div className="flex items-center justify-between border-t border-surface-alt pt-3 text-sm">
              <span className="text-secondary">Penalidades ativas</span>
              <span className="font-semibold text-alert">{penaltyPoints} ponto(s)</span>
            </div>
          )}

          {approvalRate !== null && (
            <div className="flex items-center justify-between border-t border-surface-alt pt-3 text-sm">
              <span className="text-secondary">Taxa de aprovação</span>
              <span className="font-semibold text-accent">{approvalRate}%</span>
            </div>
          )}

          {hasWeakDay && (
            <div className="rounded-xl border border-alert/40 bg-alert/10 p-3 text-sm text-secondary">
              ⚠️ Essa semana teve pelo menos um dia com penalidade - vale revisar antes de seguir.
            </div>
          )}
        </div>
      </div>

      {showPublicationModal && (
        <PublicationModal
          weeklyId={weeklyId}
          courseId={courseId}
          // retry() so ao fechar (nao durante o fluxo): useApiResource.retry() dispara
          // "Carregando semana..." (early return acima), que desmontaria o modal no meio do
          // passo a passo e resetaria o step de volta pra 'intro' antes do usuario ver a tela de
          // sucesso. Ver doc comment de PublicationModal.
          onClose={() => {
            setShowPublicationModal(false);
            retry();
          }}
        />
      )}
    </div>
  );
}

function DayCard({ day, isFuture, isToday }: { day: DailyOverviewDto; isFuture: boolean; isToday: boolean }) {
  const badge = isFuture ? { icon: '🔒', label: 'Bloqueado', tone: 'muted' as const } : dailyStatusBadgeProps(day.status);

  const body = (
    <div
      className={[
        'flex items-center gap-4 rounded-2xl border bg-surface p-5',
        isToday ? 'border-accent' : 'border-surface-alt',
        isFuture ? 'opacity-50' : '',
      ].join(' ')}
    >
      <span className="w-10 shrink-0 text-sm font-bold text-secondary">{weekdayLabel(day.date)}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-primary">Dia {day.dayNumber}</p>
        {day.status === DailyStatus.InProgress && day.totalActivities > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-accent">
              Etapa {day.completedActivities} de {day.totalActivities} — em andamento
            </p>
            <div className="w-40">
              <ProgressBar progress={day.completedActivities / day.totalActivities} heightClass="h-1" />
            </div>
          </div>
        )}
      </div>
      {day.status === DailyStatus.Completed ? (
        <StatusBadge icon="✅" label={`${day.passedActivities}/${day.totalActivities} aprovadas`} tone="accent" />
      ) : (
        <StatusBadge {...badge} />
      )}
    </div>
  );

  if (isFuture) return body;
  return (
    <Link to={`/hoje?daily=${day.id}`} className="block">
      {body}
    </Link>
  );
}
