import { createContext, useContext } from 'react';
import type { DailyStateDto, WeeklyDetailDto } from '../api/types';

/**
 * Estado da sessao diaria compartilhado entre a `TodayPage` e a casca `SessionLayout` (Fase 68). A
 * casca monta sozinha, a partir daqui, tudo que antes cada atividade repetia: titulo do dia, conta-
 * giros de erros, cadeia de etapas, material do dia, pomodoro, anotacao e duvida. A Weekly e buscada
 * uma vez so pela TodayPage (antes cada atividade buscava de novo ao montar - `key` por atividade).
 */
export interface SessionContextValue {
  daily: DailyStateDto;
  weekly: WeeklyDetailDto | null;
  /** Atividade em tela - nulo fora de uma etapa (conclusao, avisos). */
  activityId: string | null;
  /** "Etapa anterior" - omitido na 1a atividade ou quando voltar nao e seguro (gravando). */
  onBack?: () => void;
  /** Volta pra uma etapa ja vista (clique no "Material de hoje"). Nulo fora de uma sessao em andamento. */
  goToActivity?: (activityId: string) => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession fora de <SessionContext.Provider> (so a TodayPage fornece).');
  return value;
}

/** Elemento do rodape fixo do cartao central - `SessionFooter` manda o conteudo pra la por portal. */
export const SessionFooterContext = createContext<HTMLElement | null>(null);
