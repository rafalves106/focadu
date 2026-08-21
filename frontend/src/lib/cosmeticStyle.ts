import { CosmeticRarity } from '../api/types';

// Sem Figma validado pra cosmeticos ainda (Fase 17/18) - cor por raridade como placeholder visual,
// mesma paleta escura/neon ja estabelecida. Compartilhado por CosmeticItemCard (swatch da loja) e
// EquippedFramePreview (borda da moldura equipada) - uma unica fonte pra "raridade -> cor".
export const RARITY_STYLE: Record<CosmeticRarity, { swatch: string; border: string; label: string; text: string }> = {
  [CosmeticRarity.Common]: { swatch: 'bg-slate-400', border: 'border-slate-400', label: 'Comum', text: 'text-slate-400' },
  [CosmeticRarity.Rare]: { swatch: 'bg-sky-400', border: 'border-sky-400', label: 'Raro', text: 'text-sky-400' },
  [CosmeticRarity.Epic]: { swatch: 'bg-purple-400', border: 'border-purple-400', label: 'Épico', text: 'text-purple-400' },
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
