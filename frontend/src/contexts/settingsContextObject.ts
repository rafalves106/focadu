import { createContext } from 'react';

// Objeto de contexto + tipo isolados num arquivo proprio, separado de SettingsProvider.tsx (o
// Provider) e useSettings.ts (o hook) - mesmo motivo de authContextObject.ts: um arquivo que so
// exporta componente(s) preserva o fast refresh do Vite.
export interface SettingsContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
