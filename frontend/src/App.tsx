import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalNav } from './components/GlobalNav';

/**
 * `children` opcional (Fase 25): quando usado como layout de rota (`/loja`, `/perfil`,
 * `/conquistas`, `/hoje`), continua vindo do `<Outlet/>` normal. `StartPage` (Fase 25) chama
 * `<App>...</App>` manualmente pras 5 sub-telas de `/start?...` que ainda precisam do menu global -
 * `/start` sem params (WorldMapPage) e a UNICA tela fora do shell, full-bleed de proposito (e o
 * destino do botao central do `GlobalNav`).
 */
export function App({ children }: { children?: ReactNode }) {
  // `key` por pathname+search (Fase 25, era so pathname): sem isso, navegar pra outra rota depois
  // de um crash mantinha o boundary "travado" (ele fica acima do <Outlet/>, nao remonta sozinho so
  // por trocar de rota) - assim o React remonta o ErrorBoundary (reseta hasError) a cada navegacao.
  // `+search` cobre `/hoje` (agora dentro do shell) navegando entre Dailies via `?daily=` sem
  // trocar de pathname - mesmo motivo que TodayRoute tinha antes de `/hoje` voltar pra ca.
  const location = useLocation();

  return (
    <div className="min-h-screen bg-base">
      <GlobalNav />
      <ErrorBoundary key={location.pathname + location.search}>{children ?? <Outlet />}</ErrorBoundary>
    </div>
  );
}
