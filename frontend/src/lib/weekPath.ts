import { DailyStatus, type CourseDetailDto, type WeeklyOverviewDto } from '../api/types';
import { isWeekDailiesDone, pendingReinforcementOf, primaryDays } from './focadaMapLines';

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

export function isDone(state: DayNodeState): boolean {
  return state === 'feito' || state === 'feito-reforco';
}

/** Algum Dia deste curso foi feito hoje: a cota é de um Dia por dia e por curso, o próximo abre amanhã. */
export function courseDoneToday(course: CourseDetailDto): boolean {
  return course.monthlies.some((m) => m.weeklies.some((w) => primaryDays(w).some((d) => d.completedToday)));
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

/** "12 semanas · 72 dias · 12 projetos" (sem projetos no curso de pré-requisito). */
export function courseSizeText(course: CourseDetailDto): string {
  const weeks = course.monthlies.flatMap((m) => m.weeklies);
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
 * Os nós de uma semana (Fase 109, redesign v1): um por Dia e, no curso com projeto, o castelo do Projeto da
 * semana no fim. O Dia que dá pra fazer agora é "Atual"; se o Dia de hoje já foi feito neste curso, o
 * próximo fica "Disponível" (abre amanhã). O code comigo mostra a borda âmbar até chegar a vez dele.
 */
export function weekPathNodes(week: WeeklyOverviewDto, courseId: string, doneToday: boolean): PathNode[] {
  const nodes: PathNode[] = primaryDays(week).map((day) => {
    let state: DayNodeState;
    if (day.status === DailyStatus.Completed) state = pendingReinforcementOf(week, day) ? 'feito-reforco' : 'feito';
    else if (day.status === DailyStatus.InProgress) state = 'atual';
    else if (day.isNext && !week.isLocked) state = doneToday ? 'disponivel' : 'atual';
    else state = day.isBridge ? 'code' : 'trancado';
    const open = isDone(state) || state === 'atual';
    return {
      key: day.id,
      state,
      label: `D${day.dayNumber}`,
      dayNumber: day.dayNumber,
      title: `Dia ${day.dayNumber}${day.title ? `, ${day.title}` : ''}: ${STATE_TEXT[state]}`,
      to: open ? `/hoje?daily=${day.id}` : null,
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
