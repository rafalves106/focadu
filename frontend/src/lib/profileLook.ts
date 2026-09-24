import { CosmeticSlot, type MarketplaceCatalogDto } from '../api/types';
import goldIcon from '../assets/pixel/medalha-ouro.png';
import silverIcon from '../assets/pixel/medalha-prata.png';
import bronzeIcon from '../assets/pixel/medalha-bronze.png';

/** Medalhas do top 3 (ouro, prata, bronze) - posicao N usa MEDALS[N - 1]. */
export const MEDALS = [goldIcon, silverIcon, bronzeIcon];

/** Moldura equipada + cor do nome equipada - os 2 cosmeticos que aparecem no perfil (Fase 70). */
export function equippedLook(catalog: MarketplaceCatalogDto) {
  return {
    frameRarity: catalog.items.find((i) => i.slot === CosmeticSlot.AvatarFrame && i.equipped)?.rarity ?? null,
    nameColor: catalog.items.find((i) => i.slot === CosmeticSlot.NameColor && i.equipped)?.name ?? null,
  };
}
