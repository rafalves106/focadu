import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { Centered, PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { BadgeGrid } from '../components/badges/BadgeGrid';
import { ReferralCard } from '../components/referral/ReferralCard';

/**
 * `/conquistas` (Fase 17) - BadgeGrid + ReferralCard numa seção simples e própria, já que o
 * encaixe visual definitivo (aba "Conquistas" do Perfil) só chega na Fase 18. Sem Figma validado
 * ainda pra nenhum dos dois componentes.
 */
export function AchievementsPage() {
  const badges = useApiResource(() => api.getUserBadges(), []);
  const referral = useApiResource(() => api.getReferralInfo(), []);

  if (badges.loading || referral.loading) return <Centered text="Carregando..." />;
  if (badges.error) return <ApiErrorScreen error={badges.error} onRetry={badges.retry} />;
  if (referral.error) return <ApiErrorScreen error={referral.error} onRetry={referral.retry} />;
  if (!badges.data || !referral.data) return null;

  return (
    <PageShell title="Conquistas" backTo="/start">
      <div className="flex flex-col gap-8">
        <BadgeGrid badges={badges.data.badges} />
        <ReferralCard info={referral.data} />
      </div>
    </PageShell>
  );
}
