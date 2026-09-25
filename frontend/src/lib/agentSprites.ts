import { CosmeticSlot, type AgentLookDto, type CosmeticItemDto, type MarketplaceCatalogDto } from '../api/types';

/**
 * Folhas de sprite do agente em pixel art (Fase 71). Cada camada (corpo numa pele, ou uma peca de
 * roupa) e uma PNG 192×48 gerada por `secret/curadoria/scripts/personagens/exportar-frontend.js`, a
 * mesma fonte do Figma (pagina "Personagens — corpo, roupas e loja"):
 * - linha de cima: 5 vistas 32×32 (frente, costas, lado-esq, lado-dir, cima);
 * - linha de baixo: 12 quadros mini 16×16 pra andar no mapa (baixo/cima/esquerda/direita × parado, passo A, passo B).
 * A peca e achada pelo `CosmeticItem.code` do backend ("parte-de-cima/moletom" -> roupa/parte-de-cima/moletom.png).
 */
const SHEETS = import.meta.glob<string>('../assets/pixel/personagem/**/*.png', { eager: true, query: '?url', import: 'default' });

export const SHEET_WIDTH = 192;
export const SHEET_HEIGHT = 48;

export const SKIN_TONES = [1, 2, 3, 4, 5] as const;

/** Cor base de cada pele (mesmas variaveis `pele/N/base` do Figma), pros seletores. */
export const SKIN_SWATCH: Record<number, string> = { 1: '#f2c8a8', 2: '#e0a47a', 3: '#c07f52', 4: '#8d5530', 5: '#5e3620' };

export type AgentView = 'frente' | 'costas' | 'lado-esq' | 'lado-dir' | 'cima';
export type MiniDirection = 'baixo' | 'cima' | 'esquerda' | 'direita';
export type AgentFrame = { view: AgentView } | { mini: MiniDirection; step: 0 | 1 | 2 };

const VIEWS: AgentView[] = ['frente', 'costas', 'lado-esq', 'lado-dir', 'cima'];
const DIRECTIONS: MiniDirection[] = ['baixo', 'cima', 'esquerda', 'direita'];

/** Tamanho e posicao do quadro dentro da folha. */
export function frameRect(frame: AgentFrame): { x: number; y: number; size: number } {
  if ('view' in frame) return { x: VIEWS.indexOf(frame.view) * 32, y: 0, size: 32 };
  return { x: (DIRECTIONS.indexOf(frame.mini) * 3 + frame.step) * 16, y: 32, size: 16 };
}

export function bodySheet(skinTone: number): string | undefined {
  return SHEETS[`../assets/pixel/personagem/corpo/pele-${skinTone}.png`];
}

export function itemSheet(code: string): string | undefined {
  return SHEETS[`../assets/pixel/personagem/roupa/${code}.png`];
}

/** Ordem de empilhamento por cima do corpo (a aura, quando existir, vai atras do corpo). */
export const LAYER_SLOTS = [CosmeticSlot.Bottom, CosmeticSlot.Shoes, CosmeticSlot.Top, CosmeticSlot.Hair] as const;
export type LayerSlot = (typeof LAYER_SLOTS)[number];

export function isAgentSlot(slot: CosmeticSlot): slot is LayerSlot {
  return (LAYER_SLOTS as readonly CosmeticSlot[]).includes(slot);
}

/** O que o agente veste: code da peca por slot (null = vazio, so o cabelo pode ficar vazio). */
export type AgentLook = { skinTone: number; layers: Record<LayerSlot, string | null> };

/** Agente do usuario a partir do catalogo; null enquanto nao foi criado. `tryOn` troca uma peca so na previa. */
export function agentLook(catalog: MarketplaceCatalogDto, tryOn?: CosmeticItemDto | null): AgentLook | null {
  if (!catalog.agent) return null;
  const layers = Object.fromEntries(
    LAYER_SLOTS.map((slot) => [slot, catalog.items.find((i) => i.slot === slot && i.equipped)?.code ?? null]),
  ) as Record<LayerSlot, string | null>;
  if (tryOn?.code && isAgentSlot(tryOn.slot)) layers[tryOn.slot] = tryOn.code;
  return { skinTone: catalog.agent.skinTone, layers };
}

/** Agente de outra pessoa (Fase 72, squad) - o backend manda o Code de cada camada; null = ainda sem agente. */
export function lookFromDto(dto: AgentLookDto | null): AgentLook | null {
  if (!dto) return null;
  return {
    skinTone: dto.skinTone,
    layers: { [CosmeticSlot.Bottom]: dto.bottom, [CosmeticSlot.Shoes]: dto.shoes, [CosmeticSlot.Top]: dto.top, [CosmeticSlot.Hair]: dto.hair } as Record<LayerSlot, string | null>,
  };
}
