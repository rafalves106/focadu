import gemIcon from '../../assets/icons/gem.png';

/**
 * Badge de saldo de Gems (Fase 14) - icone + contador, mesmo padrao pill de StatusBadge (Fase 8).
 * Usado no header do StartDashboard. Icone trocado de emoji (💎) por PNG pixel art (pedido do
 * Falves) - mesmo arquivo reaproveitado em CosmeticItemCard/CompletionSummary.
 */
export function GemBadge({ totalGems }: { totalGems: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-xs font-semibold text-primary">
      <img src={gemIcon} alt="" className="size-3.5" aria-hidden="true" />
      {totalGems}
    </span>
  );
}
