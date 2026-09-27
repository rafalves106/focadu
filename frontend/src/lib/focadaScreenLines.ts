import type { GamificationSummaryDto, RankingResultDto, SquadHqDto, StudyCalendarDto } from '../api/types';
import type { FocadaLine } from './focadaLines';

/**
 * Falas da Focada no Ranking, no Perfil e no QG do Squad (Fase 76, Figma "Focada nas telas — v2",
 * aprovadas pelo dono em 27/09/2026). Uma fala por tela: vale a primeira situacao verdadeira, na ordem
 * de cada funcao. Voz: secret/curadoria/GUIA-DE-VOZ-FOCADA.md (acolhe na ofensiva perdida).
 */

const line = (text: string, expression: FocadaLine['expression'] = 'neutra'): FocadaLine => ({ text, expression });
const decimal = (n: number) => n.toFixed(1).replace('.', ',');

export function buildRankingLine(data: RankingResultDto, weeklyScope: boolean): FocadaLine {
  const me = data.currentUserEntry;
  if (weeklyScope && !data.currentWeekScored && data.currentWeekNumber !== null) {
    return line(`Sua Semana ${data.currentWeekNumber} ainda não entrou no placar, agente. Fecha o castelo que o Score aparece.`);
  }
  if (!me || me.score <= 0) return line('Placar vazio pra você ainda. Termina a primeira semana e seu nome aparece aqui, agente.');
  if (me.position === 1) return line('Topo do placar. Aproveita a vista, agente: o segundo lugar está lendo esta mesma frase.', 'comemorando');
  if (me.position <= 3 && data.aheadEntry) {
    return line(`${me.position}º lugar e subindo. O resumo falado pesa o dobro, agente: é por ele que você passa ${data.aheadEntry.displayName}.`);
  }
  if (me.position > 10) return line(`Posição ${me.position}, agente. Aqui conta entender, não ficar online: capricha no resumo falado.`);
  if (data.aheadEntry) {
    return line(`Faltam ${decimal(data.aheadEntry.score - me.score)} pontos pro ${data.aheadEntry.displayName}. Isso é um dia bem feito, agente.`);
  }
  return line('Aqui conta a qualidade, agente. Gems medem constância; este placar mede se você entendeu.');
}

function formatDay(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

export function buildProfileLine(gamification: GamificationSummaryDto, calendar: StudyCalendarDto | null): FocadaLine {
  const { currentStreak, longestStreak, streakPausedUntil } = gamification;
  const today = calendar?.days[calendar.days.length - 1]?.status ?? null;
  const studiedToday = today === 'studied';

  if (currentStreak === 0 && longestStreak > 0 && !studiedToday) {
    return line('Ofensiva zerada, agente. Acontece. Os troféus ficam na estante e amanhã a conta recomeça.', 'acolhedora');
  }
  if (streakPausedUntil) {
    return line(`Ofensiva pausada até ${formatDay(streakPausedUntil)}: você está no castelo. Ela volta a contar quando a semana fechar.`);
  }
  if (longestStreak === 0 && !studiedToday) return line('Ficha nova, agente. Cada dia de estudo pinta um quadrado de verde. Bora começar a pintar.');
  if (!studiedToday && currentStreak > 0) return line(`${currentStreak} ${currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}, agente, e o quadrado de hoje ainda está vazio.`);
  if (currentStreak >= 7 && currentStreak === longestStreak) {
    return line(`${currentStreak} dias seguidos, seu recorde. Isso já é hábito, não sorte, agente.`, 'comemorando');
  }
  return line('Dia feito, agente. O agente agradece, e o guarda-roupa também: tem Gem nova.', 'comemorando');
}

export function buildSquadLine(hq: SquadHqDto, userId: string): FocadaLine {
  const goal = hq.weeklyGoal;
  const left = Math.max(0, goal.target - goal.completed);
  const me = hq.members.find((m) => m.userId === userId);
  if (left === 0) return line('Meta da semana batida. Squad que estuda junto passa na frente junto, agente.', 'comemorando');
  if (goal.studiedToday === 0) return line('Ninguém do squad estudou hoje ainda. Alguém tem que puxar a fila, agente. Por que não você?');
  if (me && !me.studiedToday) {
    return line(`Faltam ${left} até domingo e ${goal.studiedToday} de ${hq.members.length} já estudaram hoje. Você é o próximo, né, agente?`);
  }
  return line(`Você já fez a sua hoje. Faltam ${left} pra meta: hora de cobrar os colegas, agente.`);
}

export const NO_SQUAD_LINE = line('Estudar sozinho funciona. Com gente cobrando, funciona melhor. Cria um squad ou entra com um código.');
