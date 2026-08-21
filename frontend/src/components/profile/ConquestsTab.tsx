import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { Centered } from '../Layout';
import { ApiErrorScreen } from '../errors/ApiErrorScreen';
import { BadgeGrid } from '../badges/BadgeGrid';
import { ReferralCard } from '../referral/ReferralCard';

/**
 * Aba "Conquistas" do Perfil (Fase 18) - BadgeGrid + ReferralCard (Fase 17) movidos pra cá, não
 * recriados; era `/conquistas` (AchievementsPage), que agora só redireciona pra
 * `/perfil?tab=conquistas` (ver main.tsx).
 */
export function ConquestsTab() {
  const badges = useApiResource(() => api.getUserBadges(), []);
  const referral = useApiResource(() => api.getReferralInfo(), []);

  if (badges.loading || referral.loading) return <Centered text="Carregando..." />;
  if (badges.error) return <ApiErrorScreen error={badges.error} onRetry={badges.retry} />;
  if (referral.error) return <ApiErrorScreen error={referral.error} onRetry={referral.retry} />;
  if (!badges.data || !referral.data) return null;

  return (
    <div className="flex flex-col gap-8">
      <BadgeGrid badges={badges.data.badges} />
      <ReferralCard info={referral.data} />
    </div>
  );
}
