import { useState, type ReactNode } from 'react';
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
 *
 * Responsivo (Fase 25, adicionado depois de ver o menu quebrado ao vivo num viewport de celular -
 * 7 itens + botao central + badge nao cabem em ~390px): abaixo do breakpoint `md` (768px, mesmo
 * limiar de `useIsMobile`), os 2 grupos de texto viram um botao "☰" que abre um menu suspenso em
 * lista - so o botao central e o `HeaderUserBadge` continuam sempre visiveis na barra. Acima de
 * `md`, layout identico ao original (3 grupos numa linha so).
 */
export function GlobalNav() {
  const settings = useSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const activeCourse = courses?.find((c) => c.status === CourseStatus.Active) ?? courses?.[0] ?? null;
  const courseId = activeCourse?.id ?? null;

  const trilhaHref = courseId ? `/start?course=${courseId}` : '/start';
  const rankingHref = courseId ? `/start?course=${courseId}&ranking=1` : '/start';
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-surface-alt bg-surface">
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        {/* Desktop (md+): grupo esquerdo. */}
        <div className="hidden flex-1 items-center gap-1 md:flex">
          <NavItem to="/hoje">Hoje</NavItem>
          <NavItem to={trilhaHref}>Trilha do Curso</NavItem>
          <NavItem to={rankingHref}>Ranking</NavItem>
        </div>

        {/* Mobile (abaixo de md): hamburguer no lugar dos 2 grupos de texto. */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg text-secondary hover:text-primary md:hidden"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <MapButton />

        {/* Desktop (md+): grupo direito. */}
        <div className="hidden flex-1 items-center justify-end gap-1 md:flex">
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

        {/* Mobile: badge sempre visivel, sem o resto do grupo direito (ver menu suspenso abaixo). */}
        <div className="shrink-0 md:hidden">
          <HeaderUserBadge />
        </div>
      </div>

      {/* Mobile: menu suspenso com todos os itens em lista - fecha sozinho ao navegar. */}
      {mobileMenuOpen && (
        <div className="flex flex-col gap-1 border-t border-surface-alt p-2 md:hidden">
          <MobileNavItem to="/hoje" onNavigate={closeMobileMenu}>
            Hoje
          </MobileNavItem>
          <MobileNavItem to={trilhaHref} onNavigate={closeMobileMenu}>
            Trilha do Curso
          </MobileNavItem>
          <MobileNavItem to={rankingHref} onNavigate={closeMobileMenu}>
            Ranking
          </MobileNavItem>
          <MobileNavItem to="/perfil?tab=squad" onNavigate={closeMobileMenu}>
            Squad
          </MobileNavItem>
          <MobileNavItem to="/loja" onNavigate={closeMobileMenu}>
            Loja
          </MobileNavItem>
          <button
            type="button"
            onClick={() => {
              closeMobileMenu();
              settings.open();
            }}
            className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-secondary hover:bg-surface-alt hover:text-primary"
          >
            Configurações
          </button>
        </div>
      )}
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

function MobileNavItem({ to, onNavigate, children }: { to: string; onNavigate: () => void; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-surface-alt hover:text-primary"
    >
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
