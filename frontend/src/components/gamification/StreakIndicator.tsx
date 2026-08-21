/**
 * Indicador de streak atual (Fase 14) - "🔥 N dias", mesmo padrao pill de GemBadge/StatusBadge.
 * Usado no header do StartDashboard e, com currentStreak=0, no EmptyStateStartPage (estado
 * inicial neutro pra quem ainda nao completou nada - sem alarmismo).
 */
export function StreakIndicator({ currentStreak }: { currentStreak: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-primary">
      <span aria-hidden="true">🔥</span>
      {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
    </span>
  );
}
