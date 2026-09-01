import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeaderUserBadge } from './components/HeaderUserBadge';

/**
 * `children` opcional (Fase 25): quando usado como layout de rota (`/loja`, `/perfil`,
 * `/conquistas`), continua vindo do `<Outlet/>` normal. `StartPage` (Fase 25) passa a chamar
 * `<App>...</App>` manualmente pras 5 sub-telas de `/start?...` que ainda precisam do nav global -
 * `/start` sem params (WorldMapPage) saiu do shell, mesmo tratamento full-bleed que `/hoje` ganhou
 * na Fase 20, entao nao pode mais depender de rota aninhada pra decidir "com ou sem nav".
 */
export function App({ children }: { children?: ReactNode }) {
  // `key` pelo pathname: sem isso, navegar pra outra rota depois de um crash mantinha o boundary
  // "travado" (ele fica acima do <Outlet/>, nao remonta sozinho so por trocar de rota) - assim o
  // React remonta o ErrorBoundary (reseta hasError) a cada navegacao.
  const location = useLocation();

  return (
    <div className="min-h-screen bg-base">
      <nav className="flex items-center justify-between gap-4 border-b border-surface-alt bg-surface px-6 py-3">
        <div className="flex gap-4">
          <NavLink to="/hoje" className={({ isActive }) => navLinkClass(isActive)}>
            Hoje
          </NavLink>
          <NavLink to="/start" className={({ isActive }) => navLinkClass(isActive)}>
            Início
          </NavLink>
        </div>
        {/* Fase 18: nome+moldura equipados, link pro Perfil - unico jeito de chegar em /perfil pela UI. */}
        <HeaderUserBadge />
      </nav>
      <ErrorBoundary key={location.pathname}>
        {children ?? <Outlet />}
      </ErrorBoundary>
    </div>
  );
}

function navLinkClass(isActive: boolean) {
  return isActive ? 'font-semibold text-accent' : 'text-secondary hover:text-primary';
}
