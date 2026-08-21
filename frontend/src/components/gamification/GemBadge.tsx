/**
 * Badge de saldo de Gems (Fase 14) - icone + contador, mesmo padrao pill de StatusBadge (Fase 8).
 * Usado no header do StartDashboard.
 */
export function GemBadge({ totalGems }: { totalGems: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-primary">
      <span aria-hidden="true">💎</span>
      {totalGems}
    </span>
  );
}
