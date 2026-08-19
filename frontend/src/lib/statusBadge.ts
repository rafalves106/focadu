import { DailyStatus } from '../api/types';

export type StatusBadgeTone = 'muted' | 'accent' | 'project' | 'alert';

/** DailyStatus -> props de StatusBadge (Fase 8) - reaproveitado por StartDashboard, WeeklyDetailPage e CourseDetailPage. */
export function dailyStatusBadgeProps(status: DailyStatus): { icon: string; label: string; tone: StatusBadgeTone } {
  switch (status) {
    case DailyStatus.Completed:
      return { icon: '✅', label: 'Concluído', tone: 'accent' };
    case DailyStatus.InProgress:
      return { icon: '🔄', label: 'Em andamento', tone: 'accent' };
    default:
      return { icon: '⭕', label: 'Não iniciado', tone: 'muted' };
  }
}
