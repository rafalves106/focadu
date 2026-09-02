/**
 * Ultima posicao do personagem no mapa do mundo (Fase 25) - so `localStorage`, mesmo principio de
 * `lib/settings.ts`: nao e progresso de verdade (Gems/Streak/etc ficam no backend), e uma
 * continuidade cosmetica de navegacao, por dispositivo/navegador - nao precisa sincronizar entre
 * aparelhos. Chave por `userId` (nao um valor global fixo) - se mais de uma conta Focadu algum dia
 * logar no mesmo navegador/computador compartilhado, cada uma guarda a propria posicao.
 */
const STORAGE_KEY_PREFIX = 'focadu:world:position:';

export interface WorldPosition {
  x: number;
  y: number;
}

/** `null` se nunca salvou (1a visita ao mapa) ou o storage estiver indisponivel/corrompido - quem chama cai pro START_POSITION nesse caso. */
export function getSavedWorldPosition(userId: string): WorldPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorldPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function saveWorldPosition(userId: string, position: WorldPosition): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(position));
  } catch {
    // localStorage indisponivel (modo privado, quota cheia, etc) - degrada silenciosamente,
    // so perde a continuidade entre visitas, nada quebra.
  }
}
