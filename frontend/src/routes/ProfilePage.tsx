import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { CosmeticItemDto, GamificationSummaryDto, MarketplaceCatalogDto } from '../api/types';
import { Centered, PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { useAuth } from '../contexts/useAuth';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs, type ProfileTab } from '../components/profile/ProfileTabs';
import { InformationTab } from '../components/profile/InformationTab';
import { CustomizationTab } from '../components/profile/CustomizationTab';
import { ConquestsTab } from '../components/profile/ConquestsTab';
import { SquadTab } from '../components/profile/SquadTab';

const VALID_TABS: ProfileTab[] = ['info', 'customizacao', 'conquistas', 'squad'];

/**
 * `/perfil` (Fase 18) - 3 abas via query string `?tab=` (mesmo padrão de `/start?weekly=`), sem
 * sistema novo: só compõe GamificationSummaryDto/MarketplaceCatalogDto/BadgeDto/ReferralInfoDto,
 * todos já existentes desde as Fases 14/17. Sem endpoint consolidado novo - Promise.all aqui é o
 * mesmo padrão já usado em StartDashboard, mais simples do que orquestrar isso no backend pra uma
 * fase que é só composição de leitura.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: ProfileTab = VALID_TABS.includes(tabParam as ProfileTab) ? (tabParam as ProfileTab) : 'info';

  const { data, error, loading, retry } = useApiResource<{ gamification: GamificationSummaryDto; catalog: MarketplaceCatalogDto }>(
    () => Promise.all([api.getGamification(), api.getMarketplaceCatalog()]).then(([gamification, catalog]) => ({ gamification, catalog })),
    [],
  );
  const [catalogOverride, setCatalogOverride] = useState<MarketplaceCatalogDto | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!user) return null;
  if (loading) return <Centered text="Carregando perfil..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  const catalog = catalogOverride ?? data.catalog;

  function setTab(next: ProfileTab) {
    setSearchParams(next === 'info' ? {} : { tab: next });
  }

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

  return (
    <PageShell title="Perfil" backTo="/start">
      <div className="flex flex-col gap-6">
        <ProfileHeader displayName={user.displayName} gamification={data.gamification} catalog={catalog} />
        <ProfileTabs tab={tab} onChange={setTab} />

        {tab === 'info' && <InformationTab user={user} gamification={data.gamification} />}
        {tab === 'customizacao' && (
          <CustomizationTab
            catalog={catalog}
            busyItemId={busyItemId}
            actionError={actionError}
            onEquip={(item: CosmeticItemDto) => runAction(item.id, () => api.equipCosmetic(item.id))}
            onUnequip={(item: CosmeticItemDto) => runAction(item.id, () => api.unequipCosmetic(item.slot))}
          />
        )}
        {tab === 'conquistas' && <ConquestsTab />}
        {tab === 'squad' && <SquadTab />}
      </div>
    </PageShell>
  );
}
