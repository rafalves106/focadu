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
  // Fase 70 (tela preta ao trocar de aba do perfil): em `/perfil` a query e so a aba (`?tab=`) - com
  // ela no `key`, cada troca remontava a pagina inteira, que buscava tudo de novo e mostrava o
  // "Carregando perfil..." por um instante. La o boundary so reseta o erro (`resetKey`), sem remontar.
  const fullPath = location.pathname + location.search;
  const boundaryKey = location.pathname === '/perfil' ? location.pathname : fullPath;

  // Casca global (Fase 67, abordagem da Fase 61 levada pro sistema inteiro): a partir de `lg` o app
  // tem exatamente a altura da janela e o conteudo fica num <main> flex-1/min-h-0 - uma tela "sem
  // rolagem externa" so precisa de `lg:flex-1 lg:min-h-0 lg:overflow-hidden` e nunca mais descontar a
  // altura do nav. Tela que ainda nao foi adaptada rola dentro do <main>, nunca a janela. Abaixo de
  // `lg` a janela volta a rolar normalmente (rolagem interna no celular atrapalha a barra de endereco).
  return (
    <div className="flex min-h-dvh flex-col bg-base lg:h-dvh">
      <GlobalNav />
      <main className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        <ErrorBoundary key={boundaryKey} resetKey={fullPath}>{children ?? <Outlet />}</ErrorBoundary>
      </main>
    </div>
  );
}
