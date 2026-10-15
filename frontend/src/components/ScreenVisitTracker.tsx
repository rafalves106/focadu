import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordScreenVisit, screenVisitKey } from '../lib/screenVisits';

/** Fase 103: avisa a Api a cada troca de tela (so dentro do <ProtectedRoute/>, com sessao). Nao desenha nada. */
export function ScreenVisitTracker() {
  const { pathname, search } = useLocation();
  const screen = screenVisitKey(pathname, search);
  useEffect(() => {
    if (screen) recordScreenVisit(screen);
  }, [screen]);
  return null;
}
