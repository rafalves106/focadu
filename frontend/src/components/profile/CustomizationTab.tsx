import { ComingSoon } from '../ComingSoon';

/**
 * Aba "Customização" do Perfil (Fase 18) - EM BREVE (Fase 25, a pedido do Falves, mesmo motivo da
 * Loja - ver MarketplacePage.tsx): sem itens de verdade pra equipar ainda, a grade por slot
 * (Moldura/Cor do Nome/Banner) saiu de cena até o kit inicial de pixel art chegar. `ProfilePage`
 * não passa mais `catalog`/`busyItemId`/`actionError`/`onEquip`/`onUnequip` pra cá - reverter
 * exige trazer esses props de volta junto com o conteúdo desta aba.
 */
export function CustomizationTab() {
  return (
    <ComingSoon
      icon="🎨"
      title="Customização em breve"
      description="Molduras, cor do nome e banners ainda estão a caminho - um kit inicial de pixel art combinando com o resto da plataforma."
    />
  );
}
