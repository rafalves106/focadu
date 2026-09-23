import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CosmeticSlot } from '../api/types';
import { useAuth } from '../contexts/useAuth';
import { useSettings } from '../contexts/useSettings';
import { nameColorClass } from '../lib/cosmeticStyle';
import { useAiStatus } from '../lib/useAiStatus';
import { AI_HEALTH_DOT_CLASS, AiStatusDetails } from './AiStatusBadge';
import { EquippedFramePreview } from './EquippedFramePreview';

/**
 * "@usuario" + avatar no canto direito do GlobalNav (Fase 62, Figma node 178:143) - substitui o
 * `HeaderUserBadge` (Fase 18, link direto pro /perfil). Clique abre um menu com "Meu perfil",
 * "Configuracoes" e o status da IA: o menu do Figma nao tem nem o botao de Configuracoes nem o selo
 * de IA, e o dono decidiu mover os dois pra ca em vez de remover.
 *
 * O "@" nao e um username de verdade (User nao tem esse campo) - e o DisplayName sem espacos/acentos,
 * em minusculas. Cor: a cor de nome cosmetica equipada (Fase 18) ou, sem nenhuma, o verde do Figma.
 *
 * Ponto no avatar quando a IA nao esta ok (parcial/fora/sem resposta) - com o selo fora do nav, e o
 * unico aviso de relance de que algo caiu. `unset` (dev local sem chave) nao acende.
 *
 * Fecha no clique fora e no Esc; o catalogo cosmetico e buscado so pra isso (mesmo padrao
 * self-contained do antigo HeaderUserBadge: falhou, cai pro nome sem cor/moldura).
 */
export function UserMenu() {
  const { user } = useAuth();
  const settings = useSettings();
  const aiStatus = useAiStatus();
  const { data: catalog } = useApiResource(() => api.getMarketplaceCatalog(), []);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const equippedFrame = catalog?.items.find((i) => i.slot === CosmeticSlot.AvatarFrame && i.equipped) ?? null;
  const equippedNameColor = catalog?.items.find((i) => i.slot === CosmeticSlot.NameColor && i.equipped)?.name ?? null;
  const handle = `@${user.displayName.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase()}`;
  const aiAlert = aiStatus.health === 'degraded' || aiStatus.health === 'down' || aiStatus.health === 'unknown';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          className={`hidden font-mono font-semibold sm:inline xl:text-[16px] ${
            equippedNameColor ? nameColorClass(equippedNameColor) : 'text-accent'
          }`}
        >
          {handle}
        </span>
        <span className="relative">
          <EquippedFramePreview displayName={user.displayName} frameRarity={equippedFrame?.rarity ?? null} size="sm" />
          {aiAlert && (
            <span
              className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-surface ${AI_HEALTH_DOT_CLASS[aiStatus.health]}`}
              aria-label="A IA está com problema"
            />
          )}
        </span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-3 flex w-72 flex-col gap-3 rounded-xl border border-stroke bg-surface p-3 shadow-lg">
          <div className="flex flex-col">
            <Link
              to="/perfil"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-alt hover:text-primary"
            >
              Meu perfil
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                settings.open();
              }}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-secondary hover:bg-surface-alt hover:text-primary"
            >
              Configurações
            </button>
          </div>
          <div className="h-px bg-stroke" />
          <div className="px-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Status da IA</p>
            <AiStatusDetails status={aiStatus} />
          </div>
        </div>
      )}
    </div>
  );
}
