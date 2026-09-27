import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { GuideModal } from '../components/guide/GuideModal';
import { HelpButton } from '../components/guide/HelpButton';
import { TourOverlay } from '../components/guide/TourOverlay';
import { anchorVisible } from '../lib/guideAnchors';
import {
  APP_TOUR,
  APP_TOUR_KEY,
  BRIDGE_ITEM,
  GUIDE_SCREENS,
  REINFORCEMENT_ITEM,
  SESSION_STEP_ITEMS,
  guideScreenFor,
  screenSeenKey,
  type GuideItem,
  type GuideScreenKey,
  type TourStep,
} from '../lib/guiaTelas';
import { GuideContext, type GuideSessionDetail } from './guideContextObject';
import { useAuth } from './useAuth';

/** Quanto tempo a dica da 1a visita fica antes de a tela contar como vista. */
const FIRST_VISIT_TIP_MS = 7000;

interface ActiveTour {
  kind: 'app' | 'screen';
  steps: TourStep[];
  index: number;
}

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
 * Guia das telas (Fase 75, decisoes do dono em 26-27/09/2026) - mesmo esquema do SettingsProvider: um
 * estado so pro app inteiro, com o botao "?", a janela e o tour montados 1x como irmaos das rotas.
 *
 * - Tour do app inteiro no 1o acesso (depois do onboarding, ao chegar no start): passa pelas telas
 *   principais navegando entre elas e termina no botao "?". "Ja visto" fica no servidor
 *   (User.SeenGuides, "tour:app") - trocar de aparelho nao repete.
 * - O "?" (botao ou tecla) abre a janela da tela atual; de la sai o tour da tela, quando o aluno quiser.
 * - 1a visita a cada tela (depois do tour do app): o botao pisca e mostra a dica uma vez ("tela:<chave>").
 */
export function GuideProvider({ children }: { children: ReactNode }) {
  const { user, setCurrentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const screenKey = guideScreenFor(location.pathname, location.search);
  const screen = screenKey ? GUIDE_SCREENS[screenKey] : null;

  // Tela em que a janela foi aberta: trocar de tela fecha (ela fala da tela em que foi aberta).
  const [modalScreen, setModalScreen] = useState<GuideScreenKey | null>(null);
  const modalOpen = modalScreen !== null && modalScreen === screenKey;
  const setModalOpen = useCallback((open: boolean) => setModalScreen(open ? screenKey : null), [screenKey]);
  const [tour, setTour] = useState<ActiveTour | null>(null);
  const [sessionDetail, setSessionDetail] = useState<GuideSessionDetail | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const markSeen = useCallback(
    (key: string) => {
      const current = userRef.current;
      if (!current || current.seenGuides.includes(key)) return;
      // Otimista: o botao para de piscar na hora; o servidor devolve o usuario de verdade.
      setCurrentUser({ ...current, seenGuides: [...current.seenGuides, key] });
      api.markGuideSeen(key).then(setCurrentUser).catch(() => undefined);
    },
    [setCurrentUser],
  );

  const routeFor = useCallback(
    (key: GuideScreenKey): string | null => {
      switch (key) {
        case 'start':
          return '/start';
        case 'perfil':
          return '/perfil';
        case 'squad':
          return '/squad';
        case 'loja':
          return '/loja';
        case 'trilha':
          return courseId ? `/start?course=${courseId}` : null;
        case 'ranking':
          return courseId ? `/start?course=${courseId}&ranking=1` : null;
        default:
          return null;
      }
    },
    [courseId],
  );

  const startAppTour = useCallback(async () => {
    let firstCourse: string | null = null;
    try {
      firstCourse = (await api.getCourses())[0]?.id ?? null;
    } catch {
      firstCourse = null;
    }
    setCourseId(firstCourse);
    const needsCourse: GuideScreenKey[] = ['trilha', 'ranking'];
    const steps = APP_TOUR.filter((s) => firstCourse || !needsCourse.includes(s.screen));
    setModalOpen(false);
    setTour({ kind: 'app', steps, index: 0 });
  }, [setModalOpen]);

  // Tour do app no 1o acesso: so no start, com o onboarding feito e sem outro modal na frente.
  const autoStarted = useRef(false);
  const tourSeen = !!user?.seenGuides.includes(APP_TOUR_KEY);
  useEffect(() => {
    if (!user?.profileCompletedAt || tourSeen || screenKey !== 'start' || tour || autoStarted.current) return;
    const timer = window.setTimeout(() => {
      autoStarted.current = true;
      void startAppTour();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [user?.profileCompletedAt, tourSeen, screenKey, tour, startAppTour]);

  // Tour do app: vai pra tela do passo.
  const step = tour ? tour.steps[tour.index] : null;
  useEffect(() => {
    if (!tour || tour.kind !== 'app' || !step || step.screen === screenKey) return;
    const route = routeFor(step.screen);
    if (route) navigate(route);
  }, [tour, step, screenKey, routeFor, navigate]);

  const endTour = useCallback(() => {
    if (tour?.kind === 'app') {
      markSeen(APP_TOUR_KEY);
      if (screenKey !== 'start') navigate('/start');
    }
    setTour(null);
  }, [tour, markSeen, screenKey, navigate]);

  const items: GuideItem[] = useMemo(() => {
    if (!screen) return [];
    if (screenKey !== 'sessao' || !sessionDetail) return screen.items;
    const extra: GuideItem[] = [];
    if (sessionDetail.isReinforcement) extra.push(REINFORCEMENT_ITEM);
    else if (sessionDetail.isBridge) extra.push(BRIDGE_ITEM);
    if (sessionDetail.activityType !== null) extra.push(SESSION_STEP_ITEMS[sessionDetail.activityType]);
    return [...extra, ...screen.items];
  }, [screen, screenKey, sessionDetail]);

  const screenTourSteps = useCallback(
    (): TourStep[] =>
      screenKey ? items.filter((i) => anchorVisible(i.anchor)).map((i) => ({ screen: screenKey, anchor: i.anchor, title: i.title, text: i.text })) : [],
    [items, screenKey],
  );

  const startScreenTour = useCallback(() => {
    const steps = screenTourSteps();
    setModalOpen(false);
    if (steps.length === 0) {
      setModalOpen(true);
      return;
    }
    setTour({ kind: 'screen', steps, index: 0 });
  }, [screenTourSteps, setModalOpen]);

  const openGuide = useCallback(() => {
    if (!screenKey) return;
    setModalOpen(true);
    markSeen(screenSeenKey(screenKey));
  }, [screenKey, markSeen, setModalOpen]);

  // Tecla "?" em qualquer tela (fora de campo de texto): abre/fecha o guia.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || tour || !screenKey) return;
      e.preventDefault();
      if (modalOpen) setModalOpen(false);
      else openGuide();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tour, screenKey, modalOpen, openGuide, setModalOpen]);

  // 1a visita a cada tela: pisca e, passado o tempo da dica, conta como vista.
  const pulse =
    !!user && !!screenKey && !!screen && !screen.outside && tourSeen && !tour && !modalOpen && !user.seenGuides.includes(screenSeenKey(screenKey));
  useEffect(() => {
    if (!pulse || !screenKey) return;
    const timer = window.setTimeout(() => markSeen(screenSeenKey(screenKey)), FIRST_VISIT_TIP_MS);
    return () => window.clearTimeout(timer);
  }, [pulse, screenKey, markSeen]);

  // Resumo da tela pro report - a hora e o tamanho sao do momento em que a janela abre.
  const reportContext = () => ({
    tela: screen?.title ?? '',
    endereco: location.pathname + location.search,
    navegador: describeBrowser(navigator.userAgent),
    tamanho: `${window.innerWidth}×${window.innerHeight}`,
    hora: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  });

  const value = useMemo(() => ({ openGuide, startScreenTour, setSessionDetail }), [openGuide, startScreenTour]);

  return (
    <GuideContext.Provider value={value}>
      {children}
      {screen && (
        <HelpButton onClick={openGuide} active={modalOpen} pulse={pulse} aboveSessionBar={screenKey === 'sessao'} />
      )}
      {screen && modalOpen && !tour && (
        <GuideModal
          screen={screen}
          items={items}
          context={reportContext()}
          canTour={screenTourSteps().length > 0}
          onTour={startScreenTour}
          onClose={() => setModalOpen(false)}
        />
      )}
      {tour && step && (step.screen === screenKey || tour.kind === 'screen') && (
        <TourOverlay
          key={`${tour.kind}-${tour.index}`}
          step={step}
          index={tour.index}
          total={tour.steps.length}
          finishLabel={tour.kind === 'app' ? 'Bora estudar' : 'Entendi'}
          onNext={() => (tour.index >= tour.steps.length - 1 ? endTour() : setTour({ ...tour, index: tour.index + 1 }))}
          onBack={() => setTour({ ...tour, index: Math.max(0, tour.index - 1) })}
          onSkip={endTour}
        />
      )}
    </GuideContext.Provider>
  );
}
