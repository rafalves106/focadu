import { useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AgentMenu } from './components/shell/AgentMenu';
import { BottomBar } from './components/shell/BottomBar';
import { TopNav } from './components/shell/TopNav';
import { useAiStatus } from './lib/useAiStatus';
import { useShellData } from './lib/useShellData';

/**
 * Casca do app (Fase 25; redesign v1 na Fase 109, sistema.md §4 e §11 etapa 2): nav superior com rótulo
 * (Hoje · Trilha · Squad · Ranking) e o agente à direita, barra inferior no celular (fora do Dia, que tem
 * a própria barra de ferramentas) e o menu do agente em gaveta. Squad, Ranking e Loja só aparecem depois
 * do 1º dia fechado.
 *
 * `children` opcional (Fase 25): como layout de rota (`/loja`, `/perfil`, `/hoje`...) vem do `<Outlet/>`;
 * `StartPage` chama `<App>...</App>` à mão pras sub-telas de `/start?...`.
 */
export function App({ children }: { children?: ReactNode }) {
  // `key` por pathname+search (Fase 25): sem isso, navegar pra outra rota depois de um crash mantinha o
  // boundary "travado". Fase 70: em `/perfil` a query e so a aba - la o boundary so reseta o erro.
  const location = useLocation();
  const fullPath = location.pathname + location.search;
  const boundaryKey = location.pathname === '/perfil' ? location.pathname : fullPath;

  const shell = useShellData();
  const ai = useAiStatus();
  const health = ai.checking ? null : ai.health;
  // Endereço em que o menu foi aberto: trocar de tela fecha (mesma ideia da ajuda, GuideProvider).
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menuOpen = menuAt === fullPath;
  const openMenu = () => setMenuAt(fullPath);
  const closeMenu = () => setMenuAt(null);
  const withBottomBar = location.pathname !== '/hoje';

  // A partir de `lg` o app tem exatamente a altura da janela e o conteúdo fica num <main> flex-1/min-h-0
  // (Fase 67): tela que ainda não foi refeita rola dentro do <main>, nunca a janela. Abaixo de `lg` a
  // janela ainda rola nas telas antigas; a barra inferior é fixa, então o <main> reserva a altura dela.
  return (
    <div className="flex min-h-dvh flex-col bg-base lg:h-dvh">
      <TopNav data={shell} health={health} menuOpen={menuOpen} onOpenMenu={openMenu} hideOnMobile={!withBottomBar} />
      <main
        className={`flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto ${withBottomBar ? 'pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0' : ''}`}
      >
        <ErrorBoundary key={boundaryKey} resetKey={fullPath}>{children ?? <Outlet />}</ErrorBoundary>
      </main>
      {withBottomBar && <BottomBar data={shell} menuOpen={menuOpen} onOpenMenu={openMenu} />}
      {menuOpen && <AgentMenu data={shell} health={health} onClose={closeMenu} />}
    </div>
  );
}
