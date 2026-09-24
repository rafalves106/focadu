import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { CosmeticSlot, type CosmeticItemDto, type MarketplaceCatalogDto } from '../../api/types';
import { agentLook, LAYER_SLOTS, SKIN_SWATCH, SKIN_TONES, type AgentLook, type AgentView } from '../../lib/agentSprites';
import { RARITY_STYLE, SLOT_LABEL } from '../../lib/cosmeticStyle';
import { AgentCreator } from '../agent/AgentCreator';
import { AgentSprite, WalkingAgent } from '../agent/AgentSprite';
import { Section } from './InformationTab';
import shopIcon from '../../assets/pixel/nav-loja.png';

const VIEWS: AgentView[] = ['frente', 'costas', 'lado-esq', 'lado-dir'];

/** Ordem do guarda-roupa: de cima pra baixo, como a pessoa le o corpo. */
const WARDROBE_ORDER = [CosmeticSlot.Hair, CosmeticSlot.Top, CosmeticSlot.Bottom, CosmeticSlot.Shoes] as const;

/**
 * Aba "Customização" do Perfil (Fase 18; "em breve" de 25 a 70). Fase 71: e o guarda-roupa do agente
 * em pixel art - sem agente, o criador (kit basico + pele + cabelo gratis); com agente, as vistas, a
 * troca de pele (livre) e as pecas que a pessoa tem, por slot, pra vestir. Comprar e na Loja.
 * Moldura, cor do nome e banner (Fase 17) seguem fora ate serem redesenhados em pixel art.
 */
export function CustomizationTab({ catalog, onCatalog }: { catalog: MarketplaceCatalogDto; onCatalog: (catalog: MarketplaceCatalogDto) => void }) {
  const [busy, setBusy] = useState(false);
  const look = agentLook(catalog);

  if (!look) {
    return (
      <Section title="Crie seu agente">
        <AgentCreator onCreated={onCatalog} />
      </Section>
    );
  }

  async function run(action: () => Promise<MarketplaceCatalogDto>) {
    setBusy(true);
    try {
      onCatalog(await action());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <Section title="Seu agente">
        <div className="flex flex-wrap items-end justify-center gap-5 border-2 border-stroke bg-surface px-5 py-5">
          {VIEWS.map((view) => (
            <AgentSprite key={view} look={look} frame={{ view }} scale={3} />
          ))}
          <WalkingAgent look={look} scale={3} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-pixel-label text-[9px] text-secondary">Pele</span>
          {SKIN_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              disabled={busy}
              onClick={() => tone !== look.skinTone && run(() => api.updateAgentSkinTone(tone))}
              aria-label={`Pele ${tone}`}
              aria-pressed={look.skinTone === tone}
              className={`size-9 border-4 ${look.skinTone === tone ? 'border-accent' : 'border-stroke hover:border-secondary'}`}
              style={{ backgroundColor: SKIN_SWATCH[tone] }}
            />
          ))}
          <span className="font-pixel-label text-[8px] text-muted">Trocar a pele não custa nada</span>
        </div>
      </Section>

      <Section
        title="Guarda-roupa"
        aside={
          <Link to="/loja" className="flex shrink-0 items-center gap-2 font-pixel-label text-[9px] text-accent hover:underline">
            <img src={shopIcon} alt="" className="size-4 pixelated" />
            Vitrine da semana ›
          </Link>
        }
      >
        {WARDROBE_ORDER.map((slot) => {
          const owned = catalog.items.filter((i) => i.slot === slot && i.owned);
          return (
            <div key={slot} className="flex flex-col gap-2.5">
              <p className="font-pixel-label text-[9px] text-secondary">{SLOT_LABEL[slot]}</p>
              <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                {owned.map((item) => (
                  <WardrobeTile key={item.id} item={item} look={look} busy={busy} onWear={() => run(() => api.equipCosmetic(item.id))} />
                ))}
                {slot === CosmeticSlot.Hair && (
                  <WardrobeTile
                    look={look}
                    busy={busy}
                    bald
                    selected={!owned.some((i) => i.equipped)}
                    onWear={() => run(() => api.unequipCosmetic(CosmeticSlot.Hair))}
                  />
                )}
              </ul>
            </div>
          );
        })}
        <p className="font-pixel-label text-[8px] text-muted">Molduras, cor do nome e banners voltam redesenhados em pixel art.</p>
      </Section>
    </div>
  );
}

/** Uma peca do guarda-roupa, vestida no agente; clicar veste. `bald` = opcao "sem cabelo". */
function WardrobeTile({
  item,
  look,
  busy,
  bald = false,
  selected,
  onWear,
}: {
  item?: CosmeticItemDto;
  look: AgentLook;
  busy: boolean;
  bald?: boolean;
  selected?: boolean;
  onWear: () => void;
}) {
  const wearing = selected ?? item?.equipped ?? false;
  const preview: AgentLook = bald
    ? { ...look, layers: { ...look.layers, [CosmeticSlot.Hair]: null } }
    : { ...look, layers: { ...look.layers, [item!.slot as (typeof LAYER_SLOTS)[number]]: item!.code } };
  return (
    <li>
      <button
        type="button"
        disabled={busy || wearing}
        onClick={onWear}
        aria-pressed={wearing}
        className={`flex w-full flex-col items-center gap-2 border-2 px-2 py-3 disabled:cursor-default ${wearing ? 'border-accent' : 'border-stroke hover:border-secondary'}`}
      >
        <AgentSprite look={preview} scale={2} />
        <span className="line-clamp-2 text-center font-pixel text-base leading-tight text-primary">{bald ? 'Sem cabelo' : item!.name}</span>
        <span className={`font-pixel-label text-[8px] ${wearing ? 'text-accent' : bald || item!.isStarter ? 'text-muted' : RARITY_STYLE[item!.rarity].text}`}>
          {wearing ? 'Vestindo' : bald ? 'Grátis' : item!.isStarter ? 'Kit básico' : RARITY_STYLE[item!.rarity].label}
        </span>
      </button>
    </li>
  );
}
