import gemIcon from '../../assets/pixel/gema.png';

/** Gems (Fase 14) - caixa reta de 2px com a gema pixel e o total em VT323 (pixel art na Fase 74). */
export function GemBadge({ totalGems }: { totalGems: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 border-2 border-stroke px-2 py-1 font-pixel text-xl leading-none text-primary">
      <img src={gemIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
      {totalGems}
    </span>
  );
}
