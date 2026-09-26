import fireIcon from '../../assets/pixel/chama-streak.png';

/** Ofensiva (Fase 14) - "Ofensiva de N dias", verde quando ativa (pixel art na Fase 74). */
export function StreakIndicator({ currentStreak }: { currentStreak: number }) {
  const tone = currentStreak > 0 ? 'border-accent text-accent' : 'border-stroke text-secondary';
  return (
    <span className={`inline-flex items-center gap-1.5 border-2 px-2 py-1 font-pixel-label text-[9px] leading-none ${tone}`}>
      <img src={fireIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
      Ofensiva de {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
    </span>
  );
}
