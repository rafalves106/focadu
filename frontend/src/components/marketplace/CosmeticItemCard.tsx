import { Link } from 'react-router-dom';
import { CosmeticSlot, type CosmeticItemDto } from '../../api/types';
import { RARITY_STYLE } from '../../lib/cosmeticStyle';

const SLOT_LABEL: Record<CosmeticSlot, string> = {
  [CosmeticSlot.AvatarFrame]: 'Moldura',
  [CosmeticSlot.NameColor]: 'Cor do Nome',
  [CosmeticSlot.ProfileBanner]: 'Banner',
};

/**
 * Card de um item da loja (Fase 17) - swatch de cor por raridade (sem arte real ainda, ver
 * docs/fase-17) + nome + preço/comprar ou equipar/desequipar, dependendo de `item.owned`/
 * `item.equipped` (já resolvidos pelo backend).
 *
 * `onPurchase` opcional (Fase 18): a aba Customização do Perfil reaproveita este mesmo card pro
 * inventário, mas não vende nada por lá - sem `onPurchase`, um item não possuído mostra "Ver na
 * Loja" (link pra /loja) em vez do botão de comprar. MarketplacePage continua passando
 * `onPurchase` normalmente.
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
  onPurchase?: () => void;
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
      ) : onPurchase ? (
        <button
          type="button"
          onClick={onPurchase}
          disabled={busy}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-alt py-2.5 text-sm font-bold text-primary hover:bg-accent/10 disabled:opacity-50"
        >
          💎 {item.priceGems}
        </button>
      ) : (
        <Link
          to="/loja"
          className="flex items-center justify-center rounded-xl bg-surface-alt py-2.5 text-sm font-bold text-secondary hover:bg-accent/10 hover:text-accent"
        >
          Ver na Loja →
        </Link>
      )}
    </div>
  );
}
