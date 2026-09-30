import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { LabSession, type LabSnapshot } from './labSession';

/** Fase 87: o laboratorio da sessao do dia - fornecido pela `TodayPage`, lido pelos passos de codigo. */
export const LabContext = createContext<LabSession | null>(null);

/** Cria o laboratorio da sessao e o derruba ao sair dela (a `TodayPage` chama uma vez). */
export function useLabSessionOwner(): LabSession {
  const [session] = useState(() => new LabSession());
  useEffect(() => () => session.dispose(), [session]);
  return session;
}

export function useLab(): { session: LabSession; snapshot: LabSnapshot } {
  const session = useContext(LabContext);
  if (!session) throw new Error('useLab fora de <LabContext.Provider> (so a TodayPage fornece).');
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  return { session, snapshot };
}
