import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus } from '../api/types';
import { useSettings } from '../contexts/useSettings';
import { HeaderUserBadge } from './HeaderUserBadge';

/**
 * Menu global unico (Fase 25) - substitui o antigo `<nav>` de 2 links (Hoje/Início) do App.tsx.
 * Aparece em toda tela "de dentro de uma casa" (Hoje/Trilha/Ranking/Squad/Loja/Perfil/Projeto) -
 * a UNICA tela sem ele e o proprio mapa (WorldMapPage, `/start` sem params), que e justamente o
 * destino do botao central.
 *
 * `courseId` resolvido aqui do mesmo jeito que WorldMapPage/StartDashboard sempre fizeram (1o
 * Course Active, senao o primeiro da lista) - busca propria, mesmo padrao "self-contained" de
 * `HeaderUserBadge` (busca o catalogo so pra si, sem travar o resto do menu se falhar). Se ainda
 * nao carregou/nao existe, Trilha/Ranking caem pra `/start` (mapa) em vez de link quebrado.
 *
 * Sem destaque de "item ativo" de proposito - varios itens (Trilha/Ranking) apontam pro mesmo
 * pathname `/start` com querys diferentes, e `NavLink` so compara pathname por padrao (destacaria
 * os dois ao mesmo tempo, incorreto). Nao vale a complexidade de comparar `location.search` a mao
 * pra uma UI que o Falves ja disse que vai redesenhar em pixel art depois.
 */
export function GlobalNav() {
  const settings = useSettings();
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const activeCourse = courses?.find((c) => c.status === CourseStatus.Active) ?? courses?.[0] ?? null;
  const courseId = activeCourse?.id ?? null;

  return (
    <nav className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-surface-alt bg-surface px-4">
      <div className="flex flex-1 items-center gap-1">
        <NavItem to="/hoje">Hoje</NavItem>
        <NavItem to={courseId ? `/start?course=${courseId}` : '/start'}>Trilha do Curso</NavItem>
        <NavItem to={courseId ? `/start?course=${courseId}&ranking=1` : '/start'}>Ranking</NavItem>
      </div>

      <MapButton />

      <div className="flex flex-1 items-center justify-end gap-1">
        <NavItem to="/perfil?tab=squad">Squad</NavItem>
        <NavItem to="/loja">Loja</NavItem>
        <button
          type="button"
          onClick={settings.open}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary"
        >
          Configurações
        </button>
        <div className="ml-2 shrink-0">
          <HeaderUserBadge />
        </div>
      </div>
    </nav>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="rounded-lg px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary">
      {children}
    </Link>
  );
}

/**
 * Botao central - "onde o player volta pro mapa" (pedido do Falves). Placeholder ate ele trazer o
 * PNG pixel art proprio (ver docs/fase-25) - troca e so substituir o emoji por um `<img>`, o resto
 * do componente (Link pra /start, tamanho, posicao central) nao muda.
 */
function MapButton() {
  return (
    <Link
      to="/start"
      aria-label="Voltar para o mapa"
      title="Voltar para o mapa"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-stroke bg-surface-alt text-lg leading-none hover:border-accent"
    >
      🗺️
    </Link>
  );
}
