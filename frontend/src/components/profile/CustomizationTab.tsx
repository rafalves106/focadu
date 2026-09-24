import type { CosmeticRarity } from '../../api/types';
import { nameColorClass } from '../../lib/cosmeticStyle';
import { AgentAvatar } from './AgentSheet';
import { Section } from './InformationTab';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';
import shopIcon from '../../assets/pixel/nav-loja.png';

const SLOTS = [
  { label: 'Moldura', description: 'Borda do avatar, por raridade.' },
  { label: 'Cor do nome', description: 'Seu nome no ranking e no squad.' },
  { label: 'Banner', description: 'Fundo da sua ficha.' },
  { label: 'Roupa', description: 'Kits pro seu personagem.' },
];

/**
 * Aba "Customização" do Perfil (Fase 18) - EM BREVE desde a Fase 25 (mesmo motivo da Loja, ver
 * MarketplacePage.tsx): sem itens de verdade pra equipar ainda. Fase 70: em vez do aviso generico,
 * mostra como o agente aparece hoje (moldura e cor do nome equipadas) e os slots trancados, incluindo
 * "Roupa", que chega com os kits da sessao de arte da Loja (exige slot novo em
 * UserEquippedCosmetics). Reverter pra grade de equipar exige trazer de volta catalog/onEquip/onUnequip.
 */
export function CustomizationTab({ displayName, frameRarity, nameColor }: { displayName: string; frameRarity: CosmeticRarity | null; nameColor: string | null }) {
  return (
    <Section title="Seu visual" aside={<span className="font-pixel-label text-[9px] text-project">Em breve</span>}>
      <div className="flex items-center gap-5 border-2 border-stroke bg-surface px-5 py-4">
        <AgentAvatar displayName={displayName} frameRarity={frameRarity} size="md" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className={`truncate font-pixel text-[32px] leading-none ${nameColorClass(nameColor)}`}>{displayName}</p>
          <p className="font-pixel-label text-[8px] text-secondary">É assim que o squad e o ranking te veem</p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {SLOTS.map((slot) => (
          <li key={slot.label} className="flex flex-col gap-2.5 border-2 border-stroke p-3.5">
            <span className="flex size-12 items-center justify-center border-2 border-stroke">
              <img src={lockIcon} alt="" className="size-8 pixelated" />
            </span>
            <p className="font-pixel-label text-[10px] text-secondary">{slot.label}</p>
            <p className="font-pixel text-[17px] leading-tight text-muted">{slot.description}</p>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3.5 border-2 border-stroke bg-surface px-4 py-3.5">
        <img src={shopIcon} alt="" className="size-8 shrink-0 pixelated" />
        <div className="flex flex-col gap-1">
          <p className="font-pixel-label text-[11px] text-primary">A Loja abre com o kit de pixel art</p>
          <p className="text-[13px] text-secondary">Suas Gems continuam acumulando até lá.</p>
        </div>
      </div>
    </Section>
  );
}
