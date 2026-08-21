/**
 * Indicador discreto de revisão semanal pendente (Fase 15) - existe um WeeklyReinforcement (2+
 * dias fracos na mesma Weekly) ainda não totalmente atendido (`weekly.hasPendingWeeklyReinforcement`).
 * Só informativo, nunca bloqueia nada - sem link embutido de propósito, mesmo padrão puramente
 * apresentacional de StatusBadge/GemBadge/StreakIndicator; quem usa decide se embrulha num `<Link>`.
 */
export function WeeklyReinforcementBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-secondary">
      <span aria-hidden="true">📋</span>
      Revisão semanal disponível
    </span>
  );
}
