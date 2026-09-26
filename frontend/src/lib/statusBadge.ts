import { DailyStatus } from '../api/types';

export type StatusBadgeTone = 'muted' | 'accent' | 'project' | 'alert';

/** Sprite do selo (Fase 74: os emojis ✅/🔄/⭕/🔒 sairam - so sprite, ou nenhum). */
export type StatusBadgeIcon = 'check' | 'lock' | 'shield' | null;

/** DailyStatus -> props de StatusBadge (Fase 8) - hoje so a missao do dia (DailyMissionCard) usa. */
export function dailyStatusBadgeProps(status: DailyStatus): { icon: StatusBadgeIcon; label: string; tone: StatusBadgeTone } {
  switch (status) {
    case DailyStatus.Completed:
      return { icon: 'check', label: 'Concluído', tone: 'accent' };
    case DailyStatus.InProgress:
      return { icon: null, label: 'Em andamento', tone: 'accent' };
    default:
      return { icon: null, label: 'Não iniciado', tone: 'muted' };
  }
}
