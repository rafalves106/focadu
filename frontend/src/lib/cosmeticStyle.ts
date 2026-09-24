import { CosmeticRarity, CosmeticSlot } from '../api/types';

// Raridade -> cor, uma unica fonte (vitrine da loja, guarda-roupa, moldura equipada do avatar).
// Fase 71: saiu de slate/sky/purple pra paleta pixel art fechada (secret/rascunhos/
// loja-raridade-e-vitrine.md): Comum metal, Raro verde, Epico ambar, Lendario vermelho.
export const RARITY_STYLE: Record<CosmeticRarity, { swatch: string; border: string; label: string; text: string }> = {
  [CosmeticRarity.Common]: { swatch: 'bg-secondary', border: 'border-secondary', label: 'Comum', text: 'text-secondary' },
  [CosmeticRarity.Rare]: { swatch: 'bg-accent', border: 'border-accent', label: 'Raro', text: 'text-accent' },
  [CosmeticRarity.Epic]: { swatch: 'bg-project', border: 'border-project', label: 'Épico', text: 'text-project' },
  [CosmeticRarity.Legendary]: { swatch: 'bg-alert', border: 'border-alert', label: 'Lendário', text: 'text-alert' },
};

// Nome do item "Cor do Nome" (Fase 18, token estavel vindo do backend, ver RankingEntryDto.
// equippedNameColor/UserDto) -> classe de cor de verdade. Mesmo padrao de BADGE_INFO
// (badge.code -> label/icone): o backend so manda o token estavel, o frontend decide a
// apresentacao. Catalogo fixo via seed (SeedCosmeticCatalogUseCase) - so 3 itens no slot NameColor.
const NAME_COLOR_STYLE: Record<string, string> = {
  'Verde Neon': 'text-lime-400',
  'Vermelho Turbo': 'text-red-500',
  'Gradiente Cockpit': 'text-fuchsia-400',
};

/** Classe de cor do nome pro token equipado - cai pro texto padrão (`text-primary`) se nulo ou desconhecido. */
export function nameColorClass(token: string | null): string {
  return (token && NAME_COLOR_STYLE[token]) || 'text-primary';
}

/** Nome de cada slot pra UI (Loja, guarda-roupa). */
export const SLOT_LABEL: Record<CosmeticSlot, string> = {
  [CosmeticSlot.AvatarFrame]: 'Moldura',
  [CosmeticSlot.NameColor]: 'Cor do nome',
  [CosmeticSlot.ProfileBanner]: 'Banner',
  [CosmeticSlot.Top]: 'Parte de cima',
  [CosmeticSlot.Bottom]: 'Parte de baixo',
  [CosmeticSlot.Hair]: 'Cabeça',
  [CosmeticSlot.Shoes]: 'Tênis',
};

/** Chance de cada raridade no sorteio da vitrine (ShopShowcase no backend) - so pra explicar na tela. */
export const RARITY_CHANCE: Record<CosmeticRarity, number> = {
  [CosmeticRarity.Common]: 60,
  [CosmeticRarity.Rare]: 30,
  [CosmeticRarity.Epic]: 9,
  [CosmeticRarity.Legendary]: 1,
};
