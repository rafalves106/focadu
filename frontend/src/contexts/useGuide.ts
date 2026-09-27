import { useContext } from 'react';
import { GuideContext, type GuideContextValue } from './guideContextObject';

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext);
  if (!ctx) throw new Error('useGuide precisa ser usado dentro de <GuideProvider>.');
  return ctx;
}
