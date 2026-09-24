import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CosmeticSlot } from '../api/types';
import { useAuth } from '../contexts/useAuth';
import { agentLook, type AgentLook } from '../lib/agentSprites';
import { RARITY_STYLE } from '../lib/cosmeticStyle';
import { EquippedFramePreview } from './EquippedFramePreview';
import { AgentSprite } from './agent/AgentSprite';

/**
 * Agente do usuario no canto direito do GlobalNav (Fase 62, Figma node 178:143; 24/09/2026, pedidos
 * do dono): a cabeca do agente em pixel art, no mesmo tamanho dos icones do menu, com a borda da
 * moldura equipada - sem agente criado, as iniciais. Clique vai direto pro Perfil (o menuzinho com
 * "Meu perfil"/Configuracoes/status da IA saiu: Configuracoes e IA ganharam icones proprios na barra).
 * O catalogo e buscado so pra isso (falhou, cai pras iniciais sem moldura).
 */
export function UserMenu() {
  const { user } = useAuth();
  const { data: catalog } = useApiResource(() => api.getMarketplaceCatalog(), []);
  if (!user) return null;

  const equippedFrame = catalog?.items.find((i) => i.slot === CosmeticSlot.AvatarFrame && i.equipped) ?? null;
  const look = catalog ? agentLook(catalog) : null;

  return (
    <Link
      to="/perfil"
      aria-label="Meu perfil"
      title={user.displayName}
      className="block p-1.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {look ? (
        <AgentHead look={look} border={equippedFrame ? RARITY_STYLE[equippedFrame.rarity].border : 'border-stroke'} />
      ) : (
        <EquippedFramePreview displayName={user.displayName} frameRarity={equippedFrame?.rarity ?? null} size="sm" />
      )}
    </Link>
  );
}

/**
 * Cabeca do agente do tamanho dos icones do menu (32px, 48px no desktop largo): o sprite de frente em
 * escala 2x/3x, recortado na cabeca e nos ombros. Borda = moldura equipada.
 */
function AgentHead({ look, border }: { look: AgentLook; border: string }) {
  return (
    <span className={`relative block size-8 overflow-hidden border-2 bg-surface-alt xl:size-12 ${border}`}>
      <span className="absolute -top-0.5 -left-[18px] xl:hidden">
        <AgentSprite look={look} scale={2} />
      </span>
      <span className="absolute -top-0.5 -left-[26px] hidden xl:block">
        <AgentSprite look={look} scale={3} />
      </span>
    </span>
  );
}
