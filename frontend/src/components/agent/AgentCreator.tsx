import { useState } from 'react';
import { api } from '../../api/client';
import type { MarketplaceCatalogDto } from '../../api/types';
import { CosmeticSlot } from '../../api/types';
import { SKIN_SWATCH, SKIN_TONES, type AgentLook } from '../../lib/agentSprites';
import { PixelButton } from '../session/PixelButton';
import { AgentSprite, WalkingAgent } from './AgentSprite';

/** Kit basico (mesmos codes de AgentStarter.KitCodes no backend) - todo agente nasce com ele. */
const KIT = { [CosmeticSlot.Top]: 'parte-de-cima/moletom', [CosmeticSlot.Bottom]: 'parte-de-baixo/calca', [CosmeticSlot.Shoes]: 'tenis/tenis' };

/** Cabelos naturais que podem ser escolhidos de graca na criacao (AgentStarter.NaturalHairCodes) + careca. */
const HAIRS: { code: string | null; label: string }[] = [
  { code: 'cabelo/curto', label: 'Curto' },
  { code: 'cabelo/longo', label: 'Longo' },
  { code: 'cabelo/black-power', label: 'Black power' },
  { code: null, label: 'Sem cabelo' },
];

/**
 * Criacao do agente (Fase 71, decidido pelo dono em 24/09/2026): escolhe o tom de pele e 1 cabelo
 * natural, ganha o kit basico (moletom, calca, tenis) - tudo de graca. Aparece na Loja e na aba
 * Customizacao do Perfil enquanto o agente nao existe; `onCreated` recebe o catalogo ja recalculado.
 */
export function AgentCreator({ onCreated }: { onCreated: (catalog: MarketplaceCatalogDto) => void }) {
  const [skinTone, setSkinTone] = useState(3);
  const [hair, setHair] = useState<string | null>('cabelo/curto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const look: AgentLook = { skinTone, layers: { ...KIT, [CosmeticSlot.Hair]: hair } };

  async function create() {
    setBusy(true);
    setError(null);
    try {
      onCreated(await api.createAgent(skinTone, hair));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não deu pra criar o agente agora.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-center gap-6 border-2 border-stroke bg-surface px-6 py-5">
        <AgentSprite look={look} scale={5} />
        <div className="flex flex-col items-center gap-2">
          <WalkingAgent look={look} scale={4} />
          <span className="font-pixel-label text-[8px] text-muted">No mapa</span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-pixel-label text-[10px] text-secondary">Tom de pele</legend>
        <div className="flex flex-wrap gap-2.5">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => setSkinTone(tone)}
              aria-label={`Pele ${tone}`}
              aria-pressed={skinTone === tone}
              className={`size-11 border-4 ${skinTone === tone ? 'border-accent' : 'border-stroke hover:border-secondary'}`}
              style={{ backgroundColor: SKIN_SWATCH[tone] }}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-pixel-label text-[10px] text-secondary">Cabelo (1 grátis)</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {HAIRS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setHair(option.code)}
              aria-pressed={hair === option.code}
              className={`flex flex-col items-center gap-2 border-2 px-2 py-3 ${hair === option.code ? 'border-accent' : 'border-stroke hover:border-secondary'}`}
            >
              <AgentSprite look={{ skinTone, layers: { ...KIT, [CosmeticSlot.Hair]: option.code } }} scale={2} />
              <span className="font-pixel-label text-[9px] text-primary">{option.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <p className="text-[13px] text-secondary">
        Todo agente começa com o <span className="text-primary">kit básico</span>: moletom, calça e tênis. O resto sai da Loja, com as gemas que você ganha estudando. A pele dá pra trocar depois, sem custo.
      </p>

      {error && <p className="font-pixel-label text-[9px] text-alert">{error}</p>}
      <PixelButton onClick={create} disabled={busy} className="self-start">
        {busy ? 'Criando...' : 'Criar agente ›'}
      </PixelButton>
    </div>
  );
}
