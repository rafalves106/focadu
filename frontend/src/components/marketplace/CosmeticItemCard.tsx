import { CosmeticRarity, CosmeticSlot, type CosmeticItemDto } from '../../api/types';

// Sem Figma validado pra este componente (Fase 17) - cor por raridade como placeholder visual,
// mesma paleta escura/neon ja estabelecida. Sem ilustracao nenhuma, so o bloco de cor + nome.
const RARITY_STYLE: Record<CosmeticRarity, { swatch: string; label: string; text: string }> = {
  [CosmeticRarity.Common]: { swatch: 'bg-slate-400', label: 'Comum', text: 'text-slate-400' },
  [CosmeticRarity.Rare]: { swatch: 'bg-sky-400', label: 'Raro', text: 'text-sky-400' },
  [CosmeticRarity.Epic]: { swatch: 'bg-purple-400', label: 'Épico', text: 'text-purple-400' },
};

const SLOT_LABEL: Record<CosmeticSlot, string> = {
  [CosmeticSlot.AvatarFrame]: 'Moldura',
  [CosmeticSlot.NameColor]: 'Cor do Nome',
  [CosmeticSlot.ProfileBanner]: 'Banner',
};

/**
 * Card de um item da loja (Fase 17) - swatch de cor por raridade (sem arte real ainda, ver
 * docs/fase-17) + nome + preço/comprar ou equipar/desequipar, dependendo de `item.owned`/
 * `item.equipped` (já resolvidos pelo backend).
 */
export function CosmeticItemCard({
  item,
  busy,
  onPurchase,
  onEquip,
  onUnequip,
}: {
  item: CosmeticItemDto;
  busy: boolean;
  onPurchase: () => void;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  const rarity = RARITY_STYLE[item.rarity];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-alt bg-surface p-5">
      <div className={`h-20 w-full rounded-xl ${rarity.swatch}`} aria-hidden="true" />
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${rarity.text}`}>
          {rarity.label} · {SLOT_LABEL[item.slot]}
        </p>
        <p className="font-bold text-primary">{item.name}</p>
      </div>

      {item.owned ? (
        item.equipped ? (
          <button
            type="button"
            onClick={onUnequip}
            disabled={busy}
            className="rounded-xl border border-accent py-2.5 text-sm font-bold text-accent disabled:opacity-50"
          >
            DESEQUIPAR
          </button>
        ) : (
          <button
            type="button"
            onClick={onEquip}
            disabled={busy}
            className="rounded-xl bg-accent py-2.5 text-sm font-bold text-base disabled:opacity-50"
          >
            EQUIPAR
          </button>
        )
      ) : (
        <button
          type="button"
          onClick={onPurchase}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-alt py-2.5 text-sm font-bold text-primary hover:bg-accent/10 disabled:opacity-50"
        >
          💎 {item.priceGems}
        </button>
      )}
    </div>
  );
}
