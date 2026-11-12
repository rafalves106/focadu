import { createContext } from 'react';
import type { ActivityType } from '../api/types';

// Objeto de contexto + tipo isolados (mesmo motivo de settingsContextObject.ts: fast refresh do Vite).

/** O que o Dia conta pra ajuda (a etapa em tela troca o 1o item da lista). */
export interface GuideSessionDetail {
  activityType: ActivityType | null;
  isReinforcement: boolean;
  isBridge: boolean;
}

export interface GuideContextValue {
  /** Abre a Ajuda desta tela (item do menu do agente). */
  openGuide: () => void;
  setSessionDetail: (detail: GuideSessionDetail | null) => void;
}

export const GuideContext = createContext<GuideContextValue | null>(null);
