import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HeaderUserBadge } from './components/HeaderUserBadge';

export function App() {
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
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}

function navLinkClass(isActive: boolean) {
  return isActive ? 'font-semibold text-accent' : 'text-secondary hover:text-primary';
}
