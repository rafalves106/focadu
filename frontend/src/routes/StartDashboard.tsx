import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { DailyStatus, type CourseDetailDto, type DailyStateDto, type GamificationSummaryDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { StreakLostModal } from '../components/gamification/StreakLostModal';
import { CoursesCard } from '../components/start/CoursesCard';
import { HighlightCard } from '../components/start/HighlightCard';
import { WeekPathCard } from '../components/start/WeekPathCard';
import { YouCard } from '../components/start/YouCard';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { FocadaLine } from '../components/ui/FocadaLine';
import { EmptyStateStartPage } from './EmptyStateStartPage';
import { primaryDays } from '../lib/focadaMapLines';
import { buildStartState, startFocadaLine, studiedToday } from '../lib/startScreen';
import { pickCourse, rememberCourse } from '../lib/courseChoice';
import { courseDoneToday } from '../lib/weekPath';

interface HubData {
  /** Todos os cursos matriculados, com o detalhe (progresso, semanas, dias). */
  courses: CourseDetailDto[];
  gamification: GamificationSummaryDto;
}

interface SelectedData {
  courseId: string;
  /** null = curso sem Dia pendente (concluído) - GET /api/today devolve daily_hoje_nao_encontrada. */
  daily: DailyStateDto | null;
}

/**
 * Início (`/start` sem params). Histórico: Fase 8 (hub de cards), Fase 14 (gemas/sequência reais), Fase
 * 10 retomada (StreakLostModal), Fase 38c (vários cursos), Fase 56 (reforço pendente).
 *
 * Redesign v1 (Fase 109, molde Hub; Figma `15:2` dia por fazer, `15:477` dia feito com reforço pendente,
 * `15:833` 1º dia no celular): a coluna do dia (fio, cartão Destaque com o único Primário, caminho da
 * semana) e a coluna de estado de 432 (400 no notebook) com a fala da Focada, "Você" e "Seus cursos". No
 * 1º dia (nenhum Dia fechado no curso) somem sequência e gems. No celular a coluna de estado fica só com
 * a Focada (Você e Seus cursos não cabem sem rolar; os números estão no Perfil e o curso no fio).
 * A página não rola: a tela tem a altura da janela (`tela-cheia`) e só rola por dentro se não couber.
 */
export function StartDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const hub = useApiResource<HubData>(async () => {
    const [summaries, gamification] = await Promise.all([api.getCourses(), api.getGamification()]);
    // Detalhe de todos os cursos (N+1 aceitável - poucos cursos por usuário, ver docs/ARQUITETURA.md).
    const courses = await Promise.all(summaries.map((c) => api.getCourse(c.id)));
    return { courses, gamification };
  }, []);

  const courses = useMemo(() => hub.data?.courses ?? [], [hub.data]);
  const selectedCourse = pickCourse(courses, searchParams.get('curso'));
  const selectedId = selectedCourse?.id ?? null;

  const selected = useApiResource<SelectedData | null>(async () => {
    if (!selectedId) return null;
    try {
      return { courseId: selectedId, daily: await api.getToday(selectedId) };
    } catch (err) {
      if (err instanceof ApiError && err.code === 'daily_hoje_nao_encontrada') return { courseId: selectedId, daily: null };
      throw err;
    }
  }, [selectedId]);

  // Só "lembra" o fechamento local pra não reaparecer no mesmo carregamento depois que o
  // StreakLostModal já chamou acknowledgeStreakBreak.
  const [dismissed, setDismissed] = useState(false);

  if (hub.loading) return <Centered text="Carregando..." />;
  if (hub.error) return <ApiErrorScreen error={hub.error} onRetry={hub.retry} />;
  if (!hub.data) return null;
  // Guarda (Fase 13b): perfil completo mas sem matrícula.
  if (!selectedCourse) return <EmptyStateStartPage />;

  const { gamification } = hub.data;
  const studied = studiedToday(courses);
  // Na troca de curso, o "hoje" anterior fica até chegar o novo: só vale se for do curso escolhido.
  const current = selected.data?.courseId === selectedCourse.id ? selected.data : null;
  const state = current ? buildStartState(selectedCourse, current.daily) : null;
  const week = state?.week ?? null;
  const weekDays = week ? primaryDays(week) : [];
  // Último segmento do fio: o Dia de hoje, ou "Dia 3 feito" quando o Destaque já é a pendência seguinte.
  const dayCrumb =
    state?.highlight.kind === 'dia' ? `Dia ${state.highlight.daily.dayNumber}` : state?.doneToday ? `Dia ${state.doneToday.dayNumber} feito` : null;

  function selectCourse(courseId: string) {
    rememberCourse(courseId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('curso', courseId);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div className="tela-cheia flex flex-col gap-4 overflow-y-auto p-4 md:gap-6 md:p-6 lg:flex-row wide:p-8">
      {!dismissed && gamification.streakJustBroken && (
        <StreakLostModal longestStreak={gamification.longestStreak} onClose={() => setDismissed(true)} />
      )}

      <div className="flex min-w-0 flex-col gap-4 md:gap-6 lg:flex-1">
        <h1 className="sr-only">Início: {selectedCourse.name}</h1>
        <Breadcrumb parts={[selectedCourse.name, week && `Semana ${week.number}`, dayCrumb]} />
        {selected.error && !current ? (
          <ApiErrorScreen error={selected.error} onRetry={selected.retry} />
        ) : !state ? (
          <p className="text-corpo text-secondary">Carregando o curso...</p>
        ) : (
          <>
            <HighlightCard course={selectedCourse} state={state} streak={gamification.currentStreak} studied={studied} />
            {week && <WeekPathCard week={week} courseId={selectedCourse.id} state={state} doneToday={courseDoneToday(selectedCourse)} />}
          </>
        )}
      </div>

      <aside aria-label="Seu estado" className="flex shrink-0 flex-col gap-4 md:gap-6 lg:w-[400px] wide:w-[432px]">
        {state && <FocadaLine size="devolutiva">{startFocadaLine(state, gamification.currentStreak, studied)}</FocadaLine>}
        {state && !state.firstDay && (
          <div className="hidden md:contents">
            <YouCard
              gamification={gamification}
              todayDone={studied}
              weekDone={weekDays.filter((d) => d.status === DailyStatus.Completed).length}
              weekTotal={weekDays.length}
            />
          </div>
        )}
        <div className="hidden md:contents">
          <CoursesCard courses={courses} selected={selectedCourse} firstDay={state?.firstDay ?? false} onSelect={selectCourse} />
        </div>
      </aside>
    </div>
  );
}
