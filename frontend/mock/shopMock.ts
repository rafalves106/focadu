/**
 * Loja e agente em pixel art no mock (Fase 71) - estado em memoria, mesmas regras do backend numa
 * versao simplificada (vitrine fixa em vez do sorteio). `/__mock/loja?agente=0|1&gemas=N` reinicia e
 * abre a Loja (agente=0: ainda sem agente, cai no criador).
 */
import { randomUUID } from 'node:crypto';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const SLOT = { AvatarFrame: 0, NameColor: 1, ProfileBanner: 2, Top: 3, Bottom: 4, Hair: 5, Shoes: 6 };
const RARITY = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };

const CATALOG: [string, number, number, number, string | null, boolean][] = [
  ['Moletom', SLOT.Top, RARITY.Common, 0, 'parte-de-cima/moletom', true],
  ['Calça', SLOT.Bottom, RARITY.Common, 0, 'parte-de-baixo/calca', true],
  ['Tênis', SLOT.Shoes, RARITY.Common, 0, 'tenis/tenis', true],
  ['Camiseta cinza', SLOT.Top, RARITY.Common, 15, 'parte-de-cima/camiseta', false],
  ['Camisa social + gravata', SLOT.Top, RARITY.Rare, 35, 'parte-de-cima/camisa-social', false],
  ['Jaqueta âmbar aberta', SLOT.Top, RARITY.Rare, 45, 'parte-de-cima/jaqueta', false],
  ['Bermuda âmbar', SLOT.Bottom, RARITY.Common, 15, 'parte-de-baixo/bermuda', false],
  ['Calça jogger clara', SLOT.Bottom, RARITY.Common, 20, 'parte-de-baixo/jogger', false],
  ['Saia vermelha', SLOT.Bottom, RARITY.Common, 20, 'parte-de-baixo/saia', false],
  ['Cabelo curto', SLOT.Hair, RARITY.Common, 15, 'cabelo/curto', false],
  ['Cabelo longo âmbar', SLOT.Hair, RARITY.Common, 15, 'cabelo/longo', false],
  ['Black power', SLOT.Hair, RARITY.Common, 15, 'cabelo/black-power', false],
  ['Boné vermelho', SLOT.Hair, RARITY.Rare, 40, 'cabelo/bone', false],
  ['Capacete com visor', SLOT.Hair, RARITY.Epic, 80, 'cabelo/capacete', false],
  ['Tênis preto sola branca', SLOT.Shoes, RARITY.Common, 15, 'tenis/preto', false],
  ['Bota âmbar', SLOT.Shoes, RARITY.Rare, 35, 'tenis/bota', false],
  ['Tênis cano alto vermelho', SLOT.Shoes, RARITY.Rare, 40, 'tenis/cano-alto', false],
  ['Moldura Bronze', SLOT.AvatarFrame, RARITY.Common, 15, null, false],
];
const items = CATALOG.map(([name, slot, rarity, priceGems, code, isStarter]) => ({ id: randomUUID(), name, slot, rarity, priceGems, code, isStarter }));
const byCode = (code: string) => items.find((i) => i.code === code)!;
const SHOWCASE = ['parte-de-baixo/saia', 'cabelo/bone', 'tenis/preto', 'parte-de-cima/jaqueta', 'cabelo/capacete', 'parte-de-cima/camiseta'].map((c) => byCode(c).id);

let gems = 60;
let skinTone: number | null = 3;
let owned = new Set<string>();
let equipped = new Map<number, string>();

function nextMonday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function catalog(): Json {
  return {
    totalGems: gems,
    items: items.map((i) => ({ ...i, owned: owned.has(i.id), equipped: [...equipped.values()].includes(i.id) })),
    agent: skinTone === null ? null : { skinTone },
    showcaseItemIds: SHOWCASE,
    showcaseRenewsOn: nextMonday(),
  };
}

function createAgent(tone: number, hair: string | null) {
  skinTone = tone;
  for (const code of ['parte-de-cima/moletom', 'parte-de-baixo/calca', 'tenis/tenis', ...(hair ? [hair] : [])]) {
    const item = byCode(code);
    owned.add(item.id);
    equipped.set(item.slot, item.id);
  }
}

export function resetShop(agent: boolean, startGems: number) {
  gems = startGems;
  owned = new Set();
  equipped = new Map();
  skinTone = null;
  if (agent) createAgent(3, 'cabelo/curto');
}
resetShop(true, 60);

/** Devolve [status, corpo] se a rota e da loja/agente; undefined pra seguir pro resto do mock. */
export function handleShop(path: string, method: string, body: Json): [number, Json] | undefined {
  if (path === '/api/marketplace/catalog') return [200, catalog()];
  if (path === '/api/agent' && method === 'POST') {
    if (skinTone !== null) return [409, { error: 'agente_ja_criado', message: 'Seu agente já foi criado.' }];
    createAgent(body.skinTone, body.hairCode ?? null);
    return [200, catalog()];
  }
  if (path === '/api/agent/skin' && method === 'PUT') {
    skinTone = body.skinTone;
    return [200, catalog()];
  }
  if (path === '/api/marketplace/purchase' && method === 'POST') {
    const item = items.find((i) => i.id === body.itemId);
    if (!item) return [404, { error: 'item_nao_encontrado', message: 'Item não encontrado.' }];
    if (gems < item.priceGems) return [409, { error: 'gems_insuficientes', message: 'Você não tem Gems suficientes.' }];
    gems -= item.priceGems;
    owned.add(item.id);
    return [200, catalog()];
  }
  if (path === '/api/marketplace/equip' && method === 'POST') {
    const item = items.find((i) => i.id === body.itemId)!;
    equipped.set(item.slot, item.id);
    return [200, catalog()];
  }
  if (path === '/api/marketplace/unequip' && method === 'POST') {
    if (body.slot === 'Hair') equipped.delete(SLOT.Hair);
    return [200, catalog()];
  }
  return undefined;
}
