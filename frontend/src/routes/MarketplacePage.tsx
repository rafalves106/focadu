import { useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { CosmeticSlot, MarketplaceCatalogDto } from '../api/types';
import { Centered, PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { CosmeticItemCard } from '../components/marketplace/CosmeticItemCard';
import { CosmeticSlotFilter } from '../components/marketplace/CosmeticSlotFilter';
import { GemBadge } from '../components/gamification/GemBadge';

/**
 * Loja de Cosméticos (Fase 17, tela 14 do inventário original) - sem Figma validado ainda (ver
 * docs/fase-17), cor por raridade como placeholder. Comprar/equipar/desequipar cada um devolve o
 * catálogo inteiro recalculado - `catalogOverride` guarda essa resposta mais recente (derivado no
 * render, nunca via effect) pra atualizar a tela na hora, sem esperar um refetch; até a 1ª ação,
 * `catalog` cai pro `data` original do `useApiResource`.
 */
export function MarketplacePage() {
  const { data, error, loading, retry } = useApiResource(() => api.getMarketplaceCatalog(), []);
  const [catalogOverride, setCatalogOverride] = useState<MarketplaceCatalogDto | null>(null);
  const [slotFilter, setSlotFilter] = useState<CosmeticSlot | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <Centered text="Carregando loja..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  const catalog = catalogOverride ?? data;
  if (!catalog) return null;

  async function runAction(itemId: string, action: () => Promise<MarketplaceCatalogDto>) {
    setBusyItemId(itemId);
    setActionError(null);
    try {
      setCatalogOverride(await action());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Não foi possível completar a ação.');
    } finally {
      setBusyItemId(null);
    }
  }

  const filteredItems = slotFilter === null ? catalog.items : catalog.items.filter((item) => item.slot === slotFilter);

  return (
    <PageShell title="Loja" backTo="/start">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <CosmeticSlotFilter slot={slotFilter} onChange={setSlotFilter} />
          <GemBadge totalGems={catalog.totalGems} />
        </div>

        {actionError && <p className="text-sm text-alert">{actionError}</p>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {filteredItems.map((item) => (
            <CosmeticItemCard
              key={item.id}
              item={item}
              busy={busyItemId === item.id}
              onPurchase={() => runAction(item.id, () => api.purchaseCosmeticItem(item.id))}
              onEquip={() => runAction(item.id, () => api.equipCosmetic(item.id))}
              onUnequip={() => runAction(item.id, () => api.unequipCosmetic(item.slot))}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
