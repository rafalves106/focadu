import { useContext } from 'react';
import { SettingsContext, type SettingsContextValue } from './settingsContextObject';

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings precisa ser usado dentro de <SettingsProvider>.');
  return ctx;
}
