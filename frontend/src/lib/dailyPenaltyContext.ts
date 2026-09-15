import { useSyncExternalStore } from 'react';

/**
 * Fase 36: pontos de penalidade da Daily em andamento, pro `GlobalNav` (sempre montado, fora da
 * arvore de `TodayPage`) mostrar o contador de erros no header em vez do badge flutuante antigo
 * (`fixed left-6`, confundido com um contador de etapa numa verificacao ao vivo). Mesmo padrao de
 * `lib/studyAssistantContext.ts` (store externo modulo-level via `useSyncExternalStore`, nao React
 * Context) - `TodayPage` seta isso via `useEffect` usando dado que ja tem (`daily.penaltyPoints`/
 * `penaltyThreshold`), sem precisar de um Context Provider novo envolvendo o app inteiro so pra
 * isso. `null` fora de uma sessao ativa - `GlobalNav` esconde o badge nesse caso (nunca mostra
 * "erros" fora do contexto de uma Daily em andamento).
 */
export interface DailyPenaltyState {
  penaltyPoints: number;
  penaltyThreshold: number;
}

let current: DailyPenaltyState | null = null;
const listeners = new Set<() => void>();

export function setDailyPenalty(state: DailyPenaltyState | null) {
  current = state;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

export function useDailyPenalty(): DailyPenaltyState | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
