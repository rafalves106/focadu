import { useSyncExternalStore } from 'react';

/**
 * "O que está na tela agora" pro Suporte Rápido de IA (QuickQuestionOrb, Fase 32) - texto livre
 * enviado como Context pro backend (ver AskStudyAssistantUseCase), pra IA responder com base no que
 * o aluno está vendo em vez de generalidades. Store externo módulo-level (mesmo padrão de
 * sessionExpiredHandler em api/client.ts) em vez de React Context: SessionLayout/WeeklyProjectPage
 * setam isso via useEffect usando dados que já têm (weekly/content/project), sem precisar passar
 * nenhuma prop nova pelos ~9 pontos que já renderizam `<SessionLayout>`/`<QuickQuestionOrb/>` hoje.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setStudyAssistantContext(context: string | null) {
  current = context;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

export function useStudyAssistantContext(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
