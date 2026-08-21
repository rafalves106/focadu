import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CosmeticSlot } from '../api/types';
import { useAuth } from '../contexts/useAuth';
import { EquippedFramePreview } from './EquippedFramePreview';
import { nameColorClass } from '../lib/cosmeticStyle';

/**
 * Nome+moldura equipados no nav global (Fase 18) - link pra /perfil. Busca o catálogo só pra isso
 * (mesmo GET que /loja e /perfil já usam) - se ainda não carregou/falhou, cai pro nome sem cor/
 * moldura em vez de bloquear o nav inteiro (não é informação crítica o suficiente pra justificar
 * uma tela de erro aqui).
 */
export function HeaderUserBadge() {
  const { user } = useAuth();
  const { data: catalog } = useApiResource(() => api.getMarketplaceCatalog(), []);

  if (!user) return null;

  const equippedFrame = catalog?.items.find((i) => i.slot === CosmeticSlot.AvatarFrame && i.equipped) ?? null;
  const equippedNameColor = catalog?.items.find((i) => i.slot === CosmeticSlot.NameColor && i.equipped)?.name ?? null;

  return (
    <Link to="/perfil" className="flex items-center gap-2">
      <EquippedFramePreview displayName={user.displayName} frameRarity={equippedFrame?.rarity ?? null} size="sm" />
      <span className={`text-sm font-semibold ${nameColorClass(equippedNameColor)}`}>{user.displayName}</span>
    </Link>
  );
}
