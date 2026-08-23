import { CosmeticRarity } from '../api/types';
import { RARITY_STYLE } from '../lib/cosmeticStyle';

/**
 * Placeholder de avatar (Fase 18) - escopo controlado: sem sistema de foto/upload de verdade
 * ainda (ver docs/fase-18), só as iniciais do nome dentro de um círculo. A "moldura" equipada
 * (CosmeticSlot.AvatarFrame) vira um anel colorido por raridade ao redor - mesma cor do swatch da
 * loja (RARITY_STYLE), nunca uma ilustração inventada.
 */
export function EquippedFramePreview({
  displayName,
  frameRarity,
  size = 'md',
}: {
  displayName: string;
  frameRarity: CosmeticRarity | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const sizeClass = { sm: 'size-9 text-sm', md: 'size-14 text-lg', lg: 'size-20 text-2xl' }[size];
  const ringClass = frameRarity !== null ? `border-2 ${RARITY_STYLE[frameRarity].border}` : 'border border-stroke';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-alt font-bold text-primary ${sizeClass} ${ringClass}`}
      aria-hidden="true"
    >
      {initials || '?'}
    </div>
  );
}
