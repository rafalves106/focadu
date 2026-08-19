import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  // `key` pelo pathname: sem isso, navegar pra outra rota depois de um crash mantinha o boundary
  // "travado" (ele fica acima do <Outlet/>, nao remonta sozinho so por trocar de rota) - assim o
  // React remonta o ErrorBoundary (reseta hasError) a cada navegacao.
  const location = useLocation();

  return (
    <div className="min-h-screen bg-base">
      <nav className="flex gap-4 border-b border-surface-alt bg-surface px-6 py-3">
        <NavLink to="/hoje" className={({ isActive }) => navLinkClass(isActive)}>
          Hoje
        </NavLink>
        <NavLink to="/start" className={({ isActive }) => navLinkClass(isActive)}>
          Início
        </NavLink>
        <NavLink to="/admin/conteudo" className={({ isActive }) => navLinkClass(isActive)}>
          Conteúdo
        </NavLink>
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
