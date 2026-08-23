/**
 * Indicador de streak atual (Fase 14) - "🔥 STREAK DE N DIAS", mesmo padrao pill de GemBadge/
 * StatusBadge. Usado no header do StartDashboard e, com currentStreak=0, no EmptyStateStartPage
 * (estado inicial neutro pra quem ainda nao completou nada - sem alarmismo).
 *
 * Fase 20 (Figma "dashboard-start", "Streak Tag"): preenchimento verde translucido + borda (era
 * so bg-surface-alt neutro) - streak > 0 e uma conquista real, ganhou destaque visual proprio; em
 * 0 continua neutro (sem soar como penalidade).
 */
export function StreakIndicator({ currentStreak }: { currentStreak: number }) {
  const tone = currentStreak > 0 ? 'border border-accent bg-accent/25 text-primary' : 'bg-surface-alt text-primary';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <span aria-hidden="true">🔥</span>
      STREAK DE {currentStreak} {currentStreak === 1 ? 'DIA' : 'DIAS'}
    </span>
  );
}
