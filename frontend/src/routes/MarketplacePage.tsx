import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { Centered, PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { ComingSoon } from '../components/ComingSoon';
import { GemBadge } from '../components/gamification/GemBadge';

/**
 * Loja de Cosméticos (Fase 17, tela 14 do inventário original) - EM BREVE (Fase 25, a pedido do
 * Falves): os itens eram cor por raridade como placeholder desde sempre (sem Figma validado, ver
 * docs/fase-17); ele vai montar um kit inicial de pixel art de verdade combinando com o resto da
 * identidade visual (mapa/personagem), então a grade de itens saiu de cena até lá - sem sentido
 * vender bloco de cor sólida numa plataforma que já tem arte de verdade em outro lugar.
 * `purchaseCosmeticItem`/`equipCosmetic`/`unequipCosmetic` (api/client.ts) continuam existindo,
 * intactos - é só esta tela que parou de exercitar esse fluxo; reverter é só trazer de volta o
 * filtro por slot + grid de `CosmeticItemCard` que existiam aqui antes desta fase.
 */
export function MarketplacePage() {
  const { data, error, loading, retry } = useApiResource(() => api.getMarketplaceCatalog(), []);

  if (loading) return <Centered text="Carregando loja..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  return (
    <PageShell title="Loja" backTo="/start">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-end">
          <GemBadge totalGems={data.totalGems} />
        </div>
        <ComingSoon
          icon="🛍️"
          title="Loja em breve"
          description="Os itens de verdade ainda estão a caminho - um kit inicial de pixel art combinando com o resto da plataforma. Suas Gems continuam guardadas, prontas pra quando a loja abrir."
        />
      </div>
    </PageShell>
  );
}
