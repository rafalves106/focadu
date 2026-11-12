import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpModal } from '../components/shell/HelpModal';
import {
  BRIDGE_ITEM,
  GUIDE_SCREENS,
  REINFORCEMENT_ITEM,
  SESSION_STEP_ITEMS,
  guideScreenFor,
  type GuideItem,
  type GuideScreenKey,
} from '../lib/guiaTelas';
import { GuideContext, type GuideSessionDetail } from './guideContextObject';

const BROWSERS: [string, RegExp][] = [
  ['Edge', /Edg\/(\d+)/],
  ['Firefox', /Firefox\/(\d+)/],
  ['Chrome', /Chrome\/(\d+)/],
  ['Safari', /Version\/(\d+).*Safari/],
];
const SYSTEMS: [string, RegExp][] = [
  ['Android', /Android/],
  ['iOS', /iPhone|iPad/],
  ['Mac', /Mac OS/],
  ['Windows', /Windows/],
  ['Linux', /Linux/],
];

/** "Chrome 153 · Mac" - so o que ajuda a reproduzir um bug, sem o user-agent inteiro. */
function describeBrowser(ua: string): string {
  const browser = BROWSERS.map(([name, re]) => ({ name, version: ua.match(re)?.[1] })).find((b) => b.version);
  const system = SYSTEMS.find(([, re]) => re.test(ua))?.[0];
  return [browser ? `${browser.name} ${browser.version}` : 'Navegador', system].filter(Boolean).join(' · ');
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Ajuda das telas (Fase 75; redesign v1, Fase 109) - um estado so pro app inteiro, com o modal montado
 * 1x como irmao das rotas. Desde a Fase 109 abre pelo item "Ajuda desta tela" do menu do agente (ou pela
 * tecla "?", fora de campo de texto). Sairam o botao "?" flutuante, a dica piscando da 1a visita e os
 * tours do app e das telas (decisao do dono, direcao.md §6.5).
 */
export function GuideProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const screenKey = guideScreenFor(location.pathname, location.search);
  const screen = screenKey ? GUIDE_SCREENS[screenKey] : null;

  // Tela em que o modal foi aberto: trocar de tela fecha (ele fala da tela em que foi aberto).
  const [modalScreen, setModalScreen] = useState<GuideScreenKey | null>(null);
  const modalOpen = modalScreen !== null && modalScreen === screenKey;
  const [sessionDetail, setSessionDetail] = useState<GuideSessionDetail | null>(null);

  const openGuide = useCallback(() => {
    if (screenKey) setModalScreen(screenKey);
  }, [screenKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || !screenKey) return;
      e.preventDefault();
      setModalScreen((current) => (current === screenKey ? null : screenKey));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screenKey]);

  const items: GuideItem[] = useMemo(() => {
    if (!screen) return [];
    if (screenKey !== 'sessao' || !sessionDetail) return screen.items;
    const extra: GuideItem[] = [];
    if (sessionDetail.isReinforcement) extra.push(REINFORCEMENT_ITEM);
    else if (sessionDetail.isBridge) extra.push(BRIDGE_ITEM);
    if (sessionDetail.activityType !== null) extra.push(SESSION_STEP_ITEMS[sessionDetail.activityType]);
    return [...extra, ...screen.items];
  }, [screen, screenKey, sessionDetail]);

  // Resumo da tela pro report - a hora e o tamanho sao do momento em que o modal abre.
  const reportContext = () => ({
    tela: screen?.title ?? '',
    endereco: location.pathname + location.search,
    navegador: describeBrowser(navigator.userAgent),
    tamanho: `${window.innerWidth}×${window.innerHeight}`,
    hora: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  });

  const value = useMemo(() => ({ openGuide, setSessionDetail }), [openGuide]);

  return (
    <GuideContext.Provider value={value}>
      {children}
      {screen && modalOpen && <HelpModal screen={screen} items={items} context={reportContext()} onClose={() => setModalScreen(null)} />}
    </GuideContext.Provider>
  );
}
