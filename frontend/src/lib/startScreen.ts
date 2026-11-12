import {
  ActivityStatus,
  ActivityType,
  DailyAccessMode,
  DailyStatus,
  WeeklyProjectStatus,
  type CourseDetailDto,
  type DailyActivityDto,
  type DailyStateDto,
  type DailyStatusSummaryDto,
  type WeeklyOverviewDto,
} from '../api/types';
import { currentStop, DEFAULT_MAP_LINES, isWeekClosurePending, pendingReinforcementOf, primaryDays } from './focadaMapLines';

/**
 * Derivações do Início (Fase 109, redesign v1; sistema.md §5 Hub e §6): tudo a partir do que a tela já
 * carrega (detalhe do curso, GET /api/today e o resumo de gamificação), sem endpoint novo.
 */

/** Gems por Dia novo e pelo reforço todo aprovado (UserGemBalance.DailyGemAmount e EvaluationPolicy.ReinforcementBonusGems). */
export const DAY_GEMS = 1;
export const REINFORCEMENT_GEMS = 2;

/** Algum Dia (sem reforço) concluído hoje, em qualquer curso: a sequência do agente é global. */
export function studiedToday(courses: CourseDetailDto[]): boolean {
  return courses.some((c) => c.monthlies.some((m) => m.weeklies.some((w) => primaryDays(w).some((d) => d.completedToday))));
}

/** Curso terminado = projeto da última semana avaliado (mesma regra da fala "cursoConcluido" da trilha). */
export function isCourseFinished(course: CourseDetailDto): boolean {
  const weeks = course.monthlies.flatMap((m) => m.weeklies).sort((a, b) => a.number - b.number);
  return weeks.length > 0 && weeks[weeks.length - 1].projectStatus === WeeklyProjectStatus.Evaluated;
}

/** Onde o agente parou no curso: semana + dia do próximo Dia (ou o em andamento); dia null = projeto da semana. */
export function courseWhereabouts(course: CourseDetailDto): { week: WeeklyOverviewDto; dayNumber: number | null } | null {
  const stop = currentStop(course);
  return stop ? { week: stop.week, dayNumber: stop.day?.dayNumber ?? null } : null;
}

/** O aluno já fechou algum Dia neste curso. Antes disso, o Início fala o vocabulário mínimo do 1º dia. */
export function hasFinishedADay(course: CourseDetailDto): boolean {
  return course.monthlies.some((m) => m.weeklies.some((w) => primaryDays(w).some((d) => d.status === DailyStatus.Completed)));
}

export interface PendingReinforcement {
  /** Daily de reforço a abrir. */
  id: string;
  /** Dia de onde ele nasceu (null se não achar, ex.: reforço semanal). */
  dayNumber: number | null;
  activityCount: number | null;
}

/** O que o cartão Destaque do Início mostra (sistema.md §6). */
export type StartHighlight =
  | { kind: 'dia'; daily: DailyStateDto; title: string | null }
  | { kind: 'reforco'; reinforcement: PendingReinforcement }
  | { kind: 'projeto'; week: WeeklyOverviewDto; submitted: boolean }
  | { kind: 'publicacao'; week: WeeklyOverviewDto }
  | { kind: 'amanha' }
  | { kind: 'concluido' };

export interface StartState {
  highlight: StartHighlight;
  /** Semana do caminho da semana (a do Dia de hoje, senão onde o aluno está). */
  week: WeeklyOverviewDto | null;
  /** Dia deste curso feito hoje. */
  doneToday: DailyStatusSummaryDto | null;
  /** Próximo Dia, quando ele só abre amanhã. */
  tomorrow: DailyStatusSummaryDto | null;
  reinforcement: PendingReinforcement | null;
  /** 1º dia: nenhum Dia fechado ainda neste curso. */
  firstDay: boolean;
}

const DAY_MODES: readonly DailyAccessMode[] = [DailyAccessMode.Start, DailyAccessMode.Resume, DailyAccessMode.Replay, DailyAccessMode.NeedsProjectLanguage];

/**
 * Estado do Início pro curso escolhido. Com Dia pra fazer, ele é o Destaque. Sem (Dia de hoje feito,
 * semana esperando o projeto, curso no fim), o Destaque vira a pendência mais importante: reforço >
 * projeto aberto > publicação pendente > prévia de amanhã (sem Primário).
 */
export function buildStartState(course: CourseDetailDto, daily: DailyStateDto | null): StartState {
  const weeks = course.monthlies.flatMap((m) => m.weeklies).sort((a, b) => a.number - b.number);
  const days = weeks.flatMap((w) => primaryDays(w).map((d) => ({ week: w, day: d })));
  const doneToday = days.find(({ day }) => day.completedToday)?.day ?? null;
  const reinforcement = findReinforcement(course, weeks, daily);
  const week = (daily && weeks.find((w) => w.id === daily.weeklyId)) ?? currentStop(course)?.week ?? weeks[weeks.length - 1] ?? null;
  const next = days.find(({ day }) => day.isNext && day.status !== DailyStatus.InProgress)?.day ?? null;
  const base = { week, doneToday, reinforcement, firstDay: !hasFinishedADay(course) };

  if (!daily) return { ...base, highlight: { kind: 'concluido' }, tomorrow: null };
  if (DAY_MODES.includes(daily.accessMode)) {
    const title = days.find(({ day }) => day.id === daily.id)?.day.title ?? null;
    return { ...base, highlight: { kind: 'dia', daily, title }, tomorrow: null };
  }

  const closing = weeks.find((w) => isWeekClosurePending(w)) ?? null;
  const tomorrow = closing ? null : next;
  if (reinforcement) return { ...base, highlight: { kind: 'reforco', reinforcement }, tomorrow };
  if (closing && !closing.requiresPublicationToUnlock) {
    return { ...base, week: closing, highlight: { kind: 'projeto', week: closing, submitted: closing.projectStatus === WeeklyProjectStatus.Submitted }, tomorrow };
  }
  if (closing) return { ...base, week: closing, highlight: { kind: 'publicacao', week: closing }, tomorrow };
  return { ...base, highlight: { kind: 'amanha' }, tomorrow };
}

function findReinforcement(course: CourseDetailDto, weeks: WeeklyOverviewDto[], daily: DailyStateDto | null): PendingReinforcement | null {
  let id = daily?.pendingReinforcementDailyId ?? null;
  if (!id) {
    for (const week of weeks) {
      const day = primaryDays(week).find((d) => pendingReinforcementOf(week, d));
      if (day) {
        id = day.reinforcementDailyId;
        break;
      }
    }
  }
  if (!id) return null;
  const origin = weeks.flatMap((w) => primaryDays(w)).find((d) => d.reinforcementDailyId === id) ?? null;
  const summary = course.dailyReinforcements.find((r) => r.dailyId === id) ?? null;
  return { id, dayNumber: origin?.dayNumber ?? null, activityCount: summary?.activityCount ?? null };
}

/** Etapa em que o aluno parou (1-based) e o total, pro "Você parou na etapa 4 de 11". */
export function stepProgress(daily: DailyStateDto): { at: number; total: number } {
  const total = daily.activities.length;
  const done = daily.activities.filter((a) => a.status === ActivityStatus.Completed).length;
  return { at: Math.min(done + 1, total), total };
}

/** O que tem no Dia, em uma frase: "Leitura, 3 perguntas, 2 lacunas e uma conversa por voz." */
export function describeActivities(activities: DailyActivityDto[]): string {
  const sorted = [...activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const counts = new Map<ActivityType, number>();
  for (const a of sorted) counts.set(a.type, (counts.get(a.type) ?? 0) + 1);
  const parts = [...counts.entries()].map(([type, n]) => ACTIVITY_PHRASE[type](n));
  if (parts.length === 0) return '';
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

const ACTIVITY_PHRASE: Record<ActivityType, (n: number) => string> = {
  [ActivityType.Reading]: (n) => (n === 1 ? 'leitura' : `${n} leituras`),
  [ActivityType.Video]: (n) => (n === 1 ? 'vídeo' : `${n} vídeos`),
  [ActivityType.Quiz]: (n) => plural(n, 'pergunta', 'perguntas'),
  [ActivityType.Cloze]: (n) => plural(n, 'lacuna', 'lacunas'),
  [ActivityType.WordMatch]: (n) => (n === 1 ? 'ligar palavras' : `${n} rodadas de ligar palavras`),
  [ActivityType.Roleplay]: (n) => (n === 1 ? 'um roleplay' : `${n} roleplays`),
  [ActivityType.VoiceSummary]: (n) => (n === 1 ? 'uma conversa por voz' : `${n} conversas por voz`),
  [ActivityType.CodeStep]: (n) => plural(n, 'passo de código', 'passos de código'),
  [ActivityType.TerminalMission]: (n) => (n === 1 ? 'uma missão no terminal' : `${n} missões no terminal`),
};

/** A fala da Focada no Início: uma, até 2 linhas, no vocabulário que o aluno já viu. */
export function startFocadaLine(state: StartState, streak: number, studied: boolean): string {
  const { highlight: h } = state;
  switch (h.kind) {
    case 'concluido':
      return DEFAULT_MAP_LINES.cursoConcluido;
    case 'dia': {
      if (state.firstDay) return 'Eu sou a Focada. Aqui ninguém responde por você: você lê, pratica e explica em voz alta. Eu aponto o caminho.';
      if (h.daily.status === DailyStatus.InProgress) return fill(DEFAULT_MAP_LINES.dailyEmAndamento, { dia: h.daily.dayNumber });
      if (streak >= 2 && !studied) return `${streak} dias seguidos, agente. Hoje é o Dia ${h.daily.dayNumber}${h.title ? `: ${h.title}` : ''}.`;
      return `O Dia ${h.daily.dayNumber} está aberto, agente. Um dia por vez, e eu fico de olho.`;
    }
    case 'reforco': {
      const from = h.reinforcement.dayNumber ? `no Dia ${h.reinforcement.dayNumber}` : 'nos seus erros';
      return `${state.doneToday ? 'Dia no bolso. ' : ''}O que escapou ${from} não some sozinho, agente: eu já testei.`;
    }
    case 'projeto':
      return fill(h.submitted ? DEFAULT_MAP_LINES.projetoEntregue : DEFAULT_MAP_LINES.projetoLiberado, { semana: h.week.number });
    case 'publicacao':
      return fill(DEFAULT_MAP_LINES.publicacaoPendente, { proxima: h.week.number + 1 });
    case 'amanha':
      return state.doneToday
        ? fill(DEFAULT_MAP_LINES.diaFeitoHoje, { dia: state.doneToday.dayNumber })
        : `Por hoje é só, agente. ${state.tomorrow ? `O Dia ${state.tomorrow.dayNumber} abre amanhã.` : 'Volte amanhã.'}`;
  }
}

function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

export const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
export type StreakCell = 'estudou' | 'hoje' | 'vazio';

/** Segunda = 0 ... domingo = 6. */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

/**
 * A semana da sequência em quadradinhos: os N dias seguidos terminando hoje (se já estudou) ou ontem. Dia
 * de estudo fora da sequência atual não aparece: o backend não guarda esse histórico.
 */
export function streakWeek(currentStreak: number, todayDone: boolean): StreakCell[] {
  const today = todayIndex();
  const end = todayDone ? today : today - 1;
  const start = end - currentStreak + 1;
  return WEEKDAYS.map((_, i) => {
    if (currentStreak > 0 && i >= start && i <= end) return 'estudou';
    if (i === today) return 'hoje';
    return 'vazio';
  });
}

/** "2026-10-05" -> "05/10" (data do backend, sem fuso - nao passa por Date). */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}
