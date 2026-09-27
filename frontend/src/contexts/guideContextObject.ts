import { createContext } from 'react';
import type { ActivityType } from '../api/types';

// Objeto de contexto + tipo isolados (mesmo motivo de settingsContextObject.ts: fast refresh do Vite).

/** O que a sessao diaria conta pro guia (a etapa em tela troca o 1o item de "Esta tela"). */
export interface GuideSessionDetail {
  activityType: ActivityType | null;
  isReinforcement: boolean;
  isBridge: boolean;
}

export interface GuideContextValue {
  /** Abre a janela do guia na tela atual. */
  openGuide: () => void;
  /** Roda o tour da tela atual. */
  startScreenTour: () => void;
  setSessionDetail: (detail: GuideSessionDetail | null) => void;
}

export const GuideContext = createContext<GuideContextValue | null>(null);
