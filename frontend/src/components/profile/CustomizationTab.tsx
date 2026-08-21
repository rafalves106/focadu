import { CosmeticSlot, type CosmeticItemDto, type MarketplaceCatalogDto } from '../../api/types';
import { CosmeticItemCard } from '../marketplace/CosmeticItemCard';

// Só os 3 slots reais do domínio (CosmeticSlot) - o mockup do Figma mostra um 4º grupo "Avatar"
// (a ilustração do personagem em si), mas não existe slot compravel pra isso (ver
// docs/fase-17/fase-18) - omitido, não inventado.
const SLOT_ORDER: { slot: CosmeticSlot; label: string }[] = [
  { slot: CosmeticSlot.AvatarFrame, label: 'Moldura' },
  { slot: CosmeticSlot.NameColor, label: 'Cor do Nome' },
  { slot: CosmeticSlot.ProfileBanner, label: 'Banner' },
];

/**
 * Aba "Customização" do Perfil (Fase 18) - inventário agrupado por slot, reaproveitando
 * CosmeticItemCard (Fase 17) tal como está: itens possuídos mostram Equipar/Desequipar, os não
 * possuídos mostram "Ver na Loja" (sem `onPurchase` aqui - comprar continua só em /loja). O preview
 * ao vivo já é o ProfileHeader (acima das abas), não duplicado aqui.
 */
export function CustomizationTab({
  catalog,
  busyItemId,
  actionError,
  onEquip,
  onUnequip,
}: {
  catalog: MarketplaceCatalogDto;
  busyItemId: string | null;
  actionError: string | null;
  onEquip: (item: CosmeticItemDto) => void;
  onUnequip: (item: CosmeticItemDto) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      {actionError && <p className="text-sm text-alert">{actionError}</p>}

      {SLOT_ORDER.map(({ slot, label }) => {
        const items = catalog.items.filter((i) => i.slot === slot);
        if (items.length === 0) return null;

        return (
          <div key={slot} className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((item) => (
                <CosmeticItemCard
                  key={item.id}
                  item={item}
                  busy={busyItemId === item.id}
                  onEquip={() => onEquip(item)}
                  onUnequip={() => onUnequip(item)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
