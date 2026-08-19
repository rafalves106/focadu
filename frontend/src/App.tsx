import { NavLink, Outlet } from 'react-router-dom';

export function App() {
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
      <Outlet />
    </div>
  );
}

function navLinkClass(isActive: boolean) {
  return isActive ? 'font-semibold text-accent' : 'text-secondary hover:text-primary';
}
