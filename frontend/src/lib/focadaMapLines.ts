import { DailyStatus, WeeklyProjectStatus, type CourseDetailDto, type DailyStatusSummaryDto, type WeeklyDetailDto, type WeeklyOverviewDto } from '../api/types';
import type { FocadaLine } from './focadaLines';

/**
 * Falas da Focada no mapa da trilha (Fase 65) - aprovadas pelo dono em 23/09/2026, ver
 * secret/rascunhos/mapa-da-trilha-pixel-art.md ("Falas padrao da Focada no mapa"). Voz:
 * secret/curadoria/GUIA-DE-VOZ-FOCADA.md. Ao abrir a trilha ela diz UMA fala: vale a primeira
 * situacao verdadeira na ordem de MAP_LINE_ORDER. A troca por curso na curadoria (decidida no
 * rascunho) ainda nao tem caminho de dado - por ora so as padrao.
 */
export type FocadaMapLineKey =
  | 'cursoConcluido'
  | 'reforcoPendente'
  | 'projetoLiberado'
  | 'projetoEntregue'
  | 'dailyEmAndamento'
  | 'diaFeitoHoje'
  | 'primeiraVez'
  | 'novoMes'
  | 'novaSemana'
  | 'ultimoDiaAntesDoCastelo'
  | 'padrao';

export const DEFAULT_MAP_LINES: Record<FocadaMapLineKey, string> = {
  cursoConcluido: 'Setenta e dois dias, doze projetos, uma bandeira. Você terminou o curso, agente. Eu diria que estou surpresa, mas vi cada commit.',
  reforcoPendente: 'Tem um reforço esperando no dia {dia}, agente. Ele não some se você fingir que não viu. Eu já testei.',
  projetoLiberado: 'Os seis dias da Semana {semana} estão feitos. O castelo está aberto, agente, e a próxima semana não abre enquanto ele não cair.',
  projetoEntregue: 'Projeto da Semana {semana} entregue. A avaliação está lendo seu código. O mapa espera, eu também.',
  dailyEmAndamento: 'Você deixou o dia {dia} pela metade, agente. Termine antes que eu comece a cobrar juros.',
  diaFeitoHoje: 'Dia {dia} feito. Por hoje acabou, agente: o próximo ponto só abre amanhã. Descansar também é treino.',
  primeiraVez: 'Este é o mapa, agente. Cada ponto é um dia, cada castelo é um projeto. Você começa no primeiro. Eu fico de olho.',
  novoMes: 'Mês {mes}: {tituloMes}. Terreno novo, agente. A névoa sai conforme você anda.',
  novaSemana: 'Semana {semana} liberada. O castelo anterior caiu; esse aqui é mais alto. O dia {dia} te espera.',
  ultimoDiaAntesDoCastelo: 'Falta um dia pro castelo da Semana {semana}, agente. Depois dele, sem atalho: é projeto de verdade.',
  padrao: 'Próxima parada: dia {dia}. Faltam {faltam} dias pro castelo da Semana {semana}. Não é longe, mas também não anda sozinho.',
};

/** Dias "de verdade" da semana (sem os de reforco, que nao tem ponto no mapa), em ordem. */
export function primaryDays(week: WeeklyOverviewDto): DailyStatusSummaryDto[] {
  return week.days.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);
}

export function isWeekDailiesDone(week: WeeklyOverviewDto): boolean {
  const days = primaryDays(week);
  return days.length > 0 && days.every((d) => d.status === DailyStatus.Completed);
}

/** Reforco ainda nao concluido gerado a partir deste dia (o reforco mora na mesma semana). */
export function pendingReinforcementOf(week: WeeklyOverviewDto, day: DailyStatusSummaryDto): DailyStatusSummaryDto | null {
  if (!day.reinforcementDailyId) return null;
  const reinforcement = week.days.find((d) => d.id === day.reinforcementDailyId);
  return reinforcement && reinforcement.status !== DailyStatus.Completed ? reinforcement : null;
}

function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

/**
 * A fala do mapa pro estado atual do agente, ou null quando nenhuma situacao se aplica (ex.: semana
 * fechada esperando a publicacao do modulo - sem proxima daily e sem fala aprovada pra isso).
 * `monthTitles`: titulo de cada mes com acento (mapa.json), por numero do Monthly.
 */
export function buildFocadaMapLine(course: CourseDetailDto, monthTitles: Map<number, string>): FocadaLine | null {
  const weeks = course.monthlies.flatMap((m) => m.weeklies).sort((a, b) => a.number - b.number);
  if (weeks.length === 0) return null;
  const line = (key: FocadaMapLineKey, values: Record<string, string | number> = {}, expression: FocadaLine['expression'] = 'neutra'): FocadaLine => ({
    text: fill(DEFAULT_MAP_LINES[key], values),
    expression,
  });

  const lastWeek = weeks[weeks.length - 1];
  if (lastWeek.projectStatus === WeeklyProjectStatus.Evaluated) return line('cursoConcluido', {}, 'comemorando');

  for (const week of weeks) {
    for (const day of primaryDays(week)) {
      if (pendingReinforcementOf(week, day)) return line('reforcoPendente', { dia: day.dayNumber });
    }
  }

  const liberado = weeks.find(
    (w) => isWeekDailiesDone(w) && w.projectStatus !== WeeklyProjectStatus.Submitted && w.projectStatus !== WeeklyProjectStatus.Evaluated,
  );
  if (liberado) return line('projetoLiberado', { semana: liberado.number });

  const entregue = weeks.find((w) => w.projectStatus === WeeklyProjectStatus.Submitted);
  if (entregue) return line('projetoEntregue', { semana: entregue.number });

  const allDays = weeks.flatMap((w) => primaryDays(w).map((d) => ({ week: w, day: d })));
  const inProgress = allDays.find(({ day }) => day.status === DailyStatus.InProgress);
  if (inProgress) return line('dailyEmAndamento', { dia: inProgress.day.dayNumber });

  const doneToday = allDays.find(({ day }) => day.completedToday);
  if (doneToday) return line('diaFeitoHoje', { dia: doneToday.day.dayNumber }, 'comemorando');

  if (!allDays.some(({ day }) => day.status === DailyStatus.Completed)) return line('primeiraVez');

  const next = allDays.find(({ day }) => day.isNext);
  if (!next) return null;
  const weekDays = primaryDays(next.week);
  const monthly = course.monthlies.find((m) => m.weeklies.some((w) => w.id === next.week.id));
  const firstOfMonth = monthly ? Math.min(...monthly.weeklies.flatMap((w) => primaryDays(w).map((d) => d.dayNumber))) : NaN;

  if (monthly && next.day.dayNumber === firstOfMonth) {
    return line('novoMes', { mes: monthly.number, tituloMes: monthTitles.get(monthly.number) ?? monthly.title });
  }
  if (next.day.id === weekDays[0]?.id) return line('novaSemana', { semana: next.week.number, dia: next.day.dayNumber });
  if (next.day.id === weekDays[weekDays.length - 1]?.id) return line('ultimoDiaAntesDoCastelo', { semana: next.week.number });

  const faltam = weekDays.filter((d) => d.status !== DailyStatus.Completed).length;
  return line('padrao', { dia: next.day.dayNumber, faltam, semana: next.week.number });
}

/**
 * Falas da Focada na visao da semana (Figma "Visao da semana — v2", aprovada em 26/09/2026): as do mapa
 * olhando so esta semana, mais tres que o mapa nao tem - publicacao do modulo pendente, semana fechada e
 * semana ainda trancada. `overview` e a mesma semana vista pelo curso (traz o reforco de cada dia e o
 * "concluida hoje"); sem ele, essas duas situacoes ficam de fora.
 */
export const WEEK_LINES = {
  publicacaoPendente: 'Castelo derrubado, agente! Agora mostra pro mundo: publique a prova do módulo e a Semana {proxima} abre.',
  semanaFechada: 'Semana {semana} fechada com {nota} no castelo. Pode revisar o que quiser, agente: aqui nada tranca de novo.',
  semanaTrancada: 'Essa semana ainda está na névoa, agente. Ela abre quando a semana anterior fechar.',
} as const;

export function buildFocadaWeekLine(weekly: WeeklyDetailDto, overview: WeeklyOverviewDto | null): FocadaLine {
  const days = weekly.dailies.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);
  const project = weekly.project;
  const line = (text: string, values: Record<string, string | number> = {}, expression: FocadaLine['expression'] = 'neutra'): FocadaLine => ({
    text: fill(text, values),
    expression,
  });

  if (weekly.requiresPublicationToUnlock) return line(WEEK_LINES.publicacaoPendente, { proxima: weekly.number + 1 }, 'comemorando');
  if (project?.status === WeeklyProjectStatus.Evaluated) {
    return line(WEEK_LINES.semanaFechada, { semana: weekly.number, nota: project.score ?? '-' }, 'comemorando');
  }
  if (overview?.isLocked) return line(WEEK_LINES.semanaTrancada);

  if (overview) {
    const withReinforcement = primaryDays(overview).find((d) => pendingReinforcementOf(overview, d));
    if (withReinforcement) return line(DEFAULT_MAP_LINES.reforcoPendente, { dia: withReinforcement.dayNumber });
  }
  if (project?.status === WeeklyProjectStatus.Submitted) return line(DEFAULT_MAP_LINES.projetoEntregue, { semana: weekly.number });
  if (days.length > 0 && days.every((d) => d.status === DailyStatus.Completed)) return line(DEFAULT_MAP_LINES.projetoLiberado, { semana: weekly.number });

  const inProgress = days.find((d) => d.status === DailyStatus.InProgress);
  if (inProgress) return line(DEFAULT_MAP_LINES.dailyEmAndamento, { dia: inProgress.dayNumber });
  const doneToday = overview && primaryDays(overview).find((d) => d.completedToday);
  if (doneToday) return line(DEFAULT_MAP_LINES.diaFeitoHoje, { dia: doneToday.dayNumber }, 'comemorando');

  const next = days.find((d) => d.isNext);
  const faltam = days.filter((d) => d.status !== DailyStatus.Completed).length;
  if (next && next.id === days[days.length - 1]?.id) return line(DEFAULT_MAP_LINES.ultimoDiaAntesDoCastelo, { semana: weekly.number });
  return line(DEFAULT_MAP_LINES.padrao, { dia: (next ?? days.find((d) => d.status !== DailyStatus.Completed))?.dayNumber ?? '-', faltam, semana: weekly.number });
}
