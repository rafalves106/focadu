import type { BadgeDto } from '../api/types';
import fireIcon from '../assets/pixel/chama-streak.png';
import capIcon from '../assets/pixel/capelo.png';
import flagIcon from '../assets/pixel/bandeira.png';
import crownIcon from '../assets/pixel/coroa.png';

export interface BadgeInfo {
  icon: string;
  label: string;
  description: string;
  /** Meta do `progress` (regras em GetUserBadgesUseCase); nulo quando nao ha contagem (Founder). */
  goal: number | null;
  /** O que falta, na voz da tela ("FALTAM 18 DIAS") - so chamado com a badge trancada. */
  missing: (progress: number) => string;
}

// `code` vem estavel do backend (calculado sob demanda, ver GetUserBadgesUseCase) - label/icone/meta
// sao so apresentacao, o frontend decide (mesmo padrao de DailyStatus -> lib/statusBadge.ts). Era o
// BADGE_INFO do BadgeGrid (Fase 17) ate a Fase 70, quando a aba Conquistas virou lista em pixel art.
// Embaixador e bandeira (nao aperto de maos): 2 maos em 16x16 nao ficam legiveis.
export const BADGE_INFO: Record<string, BadgeInfo> = {
  streak_7: {
    icon: fireIcon,
    label: 'Chama de 7 dias',
    description: 'Streak recorde de 7 dias.',
    goal: 7,
    missing: (p) => plural(7 - p, 'falta 1 dia', 'dias', 'faltam'),
  },
  streak_30: {
    icon: fireIcon,
    label: 'Mestre de 1 Mês',
    description: 'Streak recorde de 30 dias.',
    goal: 30,
    missing: (p) => plural(30 - p, 'falta 1 dia', 'dias', 'faltam'),
  },
  easy_weekly: {
    icon: capIcon,
    label: 'Easy Weekly',
    description: 'Uma semana perfeita.',
    goal: 1,
    missing: () => 'falta 1 semana perfeita',
  },
  embaixador: {
    icon: flagIcon,
    label: 'Embaixador',
    description: 'Uma indicação confirmada.',
    goal: 1,
    missing: () => 'falta 1 indicação',
  },
  founder: {
    icon: crownIcon,
    label: 'Founder',
    description: 'Entre os 20 primeiros agentes.',
    goal: null,
    missing: () => 'só os 20 primeiros',
  },
};

function plural(n: number, one: string, many: string, verb: string): string {
  return n === 1 ? one : `${verb} ${n} ${many}`;
}

/** So as badges que o frontend sabe desenhar, na ordem do backend. */
export function knownBadges(badges: BadgeDto[]): { badge: BadgeDto; info: BadgeInfo }[] {
  return badges.flatMap((badge) => (BADGE_INFO[badge.code] ? [{ badge, info: BADGE_INFO[badge.code] }] : []));
}
