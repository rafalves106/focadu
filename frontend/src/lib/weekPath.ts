import { DailyStatus, type CourseDetailDto, type DailySessionRoomDto, type DailyStatusSummaryDto, type WeeklyOverviewDto } from '../api/types';
import { courseQuotaReachedToday, isWeekDailiesDone, pendingReinforcementOf, primaryDays } from './focadaMapLines';
import { isSessionsCourse, unitName, unitShort } from './sessionCount';

/** Variante do Nó de dia no Figma (`12:638`). */
export type DayNodeState =
  | 'trancado'
  | 'disponivel'
  | 'atual'
  | 'feito'
  | 'feito-reforco'
  | 'code'
  | 'castelo-trancado'
  | 'castelo-aberto';

export interface PathNode {
  key: string;
  state: DayNodeState;
  /** Rótulo embaixo do nó: "D3" ou "Projeto". */
  label: string;
  /** Número dentro do nó Disponível. */
  dayNumber: number | null;
  /** Nome acessível: "Dia 3, Porta aberta: feito". */
  title: string;
  /** Pra onde o clique leva; null = nó sem clique (trancado, abre amanhã). */
  to: string | null;
  /** Fase 112: Marca de sala no traço depois do nó (curso em sessões, Figma `97-9586`). */
  room?: RoomMark | null;
}

/** Variante da Marca de sala: feita (verde), pendente (âmbar), trancada (contorno). */
export type RoomMark = 'feita' | 'pendente' | 'trancada';

export function roomMarkOf(room: DailySessionRoomDto | null | undefined): RoomMark | null {
  if (!room) return null;
  return room.status === 'Completed' ? 'feita' : room.status === 'Locked' ? 'trancada' : 'pendente';
}

const STATE_TEXT: Record<DayNodeState, string> = {
  trancado: 'trancado',
  disponivel: 'abre amanhã',
  atual: 'hoje',
  feito: 'feito',
  'feito-reforco': 'feito, reforço pendente',
  code: 'code comigo, trancado',
  'castelo-trancado': 'trancado',
  'castelo-aberto': 'aberto',
};

/** Fase 112: o 4º argumento de weekPathNodes pro curso (nulo em curso Daily). */
export function sessionsPathOptions(course: CourseDetailDto): { roomPending: boolean } | null {
  return isSessionsCourse(course) ? { roomPending: pendingSessionRoom(course) !== null } : null;
}

export function isDone(state: DayNodeState): boolean {
  return state === 'feito' || state === 'feito-reforco';
}

/** A cota de hoje deste curso foi gasta (1 Dia; no curso em sessões, as N sessões, Fase 111): o próximo abre amanhã. */
export function courseDoneToday(course: CourseDetailDto): boolean {
  return courseQuotaReachedToday(course);
}

/** Fase 112: todos os Dias (sem reforço) do curso, em ordem, com a semana. */
export function courseDays(course: CourseDetailDto): { week: WeeklyOverviewDto; day: DailyStatusSummaryDto }[] {
  return course.monthlies
    .flatMap((m) => m.weeklies)
    .sort((a, b) => a.number - b.number)
    .flatMap((week) => primaryDays(week).map((day) => ({ week, day })));
}

/** Sessões (sem reforço) concluídas hoje neste curso. */
export function completedTodayCount(course: CourseDetailDto): number {
  return courseDays(course).filter(({ day }) => day.completedToday).length;
}

/**
 * Fase 112: a sala da sessão anterior à próxima, quando ainda falta fazê-la (a próxima sessão espera por ela, mesma
 * regra do servidor em SessionStudy). Nulo em curso Daily, sem próxima sessão ou com a sala feita.
 */
export function pendingSessionRoom(course: CourseDetailDto): { day: DailyStatusSummaryDto; week: WeeklyOverviewDto; room: DailySessionRoomDto; next: DailyStatusSummaryDto } | null {
  if (!isSessionsCourse(course)) return null;
  const days = courseDays(course);
  const i = days.findIndex(({ day }) => day.isNext && day.status !== DailyStatus.InProgress && day.status !== DailyStatus.Completed);
  if (i <= 0) return null;
  const { day, week } = days[i - 1];
  const room = day.sessionRoom;
  if (!room || room.status === 'Completed' || room.status === 'Locked') return null;
  return { day, week, room, next: days[i].day };
}

/** Total de Dias do curso (sem reforço), pra "Dia 3 de 72". */
export function courseDayCount(course: CourseDetailDto): number {
  return course.monthlies.reduce((sum, m) => sum + m.weeklies.reduce((s, w) => s + primaryDays(w).length, 0), 0);
}

/** Dias (sem reforço) já feitos no curso. */
export function courseDoneDayCount(course: CourseDetailDto): number {
  return course.monthlies.reduce(
    (sum, m) => sum + m.weeklies.reduce((s, w) => s + primaryDays(w).filter((d) => d.status === DailyStatus.Completed).length, 0),
    0,
  );
}

/** "12 semanas · 72 dias · 12 projetos" (sem projetos no curso de pré-requisito); em sessões, "15 semanas · 90 sessões · até 3 por dia, cada uma com a sua sala". */
export function courseSizeText(course: CourseDetailDto): string {
  const weeks = course.monthlies.flatMap((m) => m.weeklies);
  if (isSessionsCourse(course)) {
    return `${weeks.length} ${weeks.length === 1 ? 'semana' : 'semanas'} · ${courseDayCount(course)} sessões · até ${course.sessionsPerDay ?? 1} por dia, cada uma com a sua sala`;
  }
  const projects = weeks.filter((w) => !w.isPracticeOnly).length;
  return [
    `${weeks.length} ${weeks.length === 1 ? 'semana' : 'semanas'}`,
    `${courseDayCount(course)} dias`,
    projects > 0 ? `${projects} ${projects === 1 ? 'projeto' : 'projetos'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function projectLink(courseId: string, weekId: string): string {
  return `/start?course=${courseId}&weekly=${weekId}&project=1`;
}

export function weekLink(courseId: string, weekId: string): string {
  return `/start?course=${courseId}&weekly=${weekId}`;
}

/**
 * A semana já chegou (Fase 109b): algum Dia começado ou feito, ou o próximo Dia do curso está nela. O
 * `isLocked` da API só cobre semana atrás de projeto ou publicação pendente; semana à frente da atual,
 * pela sequência dos Dias, também conta como trancada.
 */
export function isWeekReached(week: WeeklyOverviewDto): boolean {
  if (week.isLocked) return false;
  return primaryDays(week).some((d) => d.isNext || d.status === DailyStatus.InProgress || d.status === DailyStatus.Completed);
}

/**
 * Os nós de uma semana (Fase 109, redesign v1): um por Dia e, no curso com projeto, o castelo do Projeto da
 * semana no fim. O Dia que dá pra fazer agora é "Atual"; se o Dia de hoje já foi feito neste curso, o
 * próximo fica "Disponível" (abre amanhã). O code comigo mostra a borda âmbar até chegar a vez dele, só
 * na semana já alcançada: em semana futura é cadeado, como os outros Dias (Figma `18:1613`).
 */
export function weekPathNodes(
  week: WeeklyOverviewDto,
  courseId: string,
  doneToday: boolean,
  sessions: { roomPending: boolean } | null = null,
): PathNode[] {
  const reached = isWeekReached(week);
  const nodes: PathNode[] = primaryDays(week).map((day) => {
    let state: DayNodeState;
    if (day.status === DailyStatus.Completed) state = pendingReinforcementOf(week, day) ? 'feito-reforco' : 'feito';
    else if (day.status === DailyStatus.InProgress) state = 'atual';
    // Fase 112: em sessões, a próxima espera a sala da anterior ou a cota de amanhã no estado Trancado (sem "abre amanhã").
    else if (day.isNext && !week.isLocked) state = sessions && (sessions.roomPending || doneToday) ? 'trancado' : doneToday ? 'disponivel' : 'atual';
    else state = day.isBridge && reached ? 'code' : 'trancado';
    const open = isDone(state) || state === 'atual';
    const room = sessions ? roomMarkOf(day.sessionRoom) : null;
    return {
      key: day.id,
      state,
      label: unitShort(!!sessions, day.dayNumber),
      dayNumber: day.dayNumber,
      title: `${unitName(!!sessions, day.dayNumber)}${day.title ? `, ${day.title}` : ''}: ${STATE_TEXT[state]}${room ? `; sala ${room}` : ''}`,
      to: open ? `/hoje?daily=${day.id}` : null,
      room,
    };
  });
  if (!week.isPracticeOnly) {
    const state: DayNodeState = isWeekDailiesDone(week) ? 'castelo-aberto' : 'castelo-trancado';
    nodes.push({
      key: `${week.id}-projeto`,
      state,
      label: 'Projeto',
      dayNumber: null,
      title: `Projeto da Semana ${week.number}: ${STATE_TEXT[state]}`,
      to: projectLink(courseId, week.id),
    });
  }
  return nodes;
}
