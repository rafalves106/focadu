import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus } from '../api/types';
import mapIcon from '../assets/header/map-white-version.png';
import { UserMenu } from './UserMenu';
import { PenaltyHeaderBadge } from './gamification/PenaltyHeaderBadge';
import { PomodoroHeaderBadge } from './pomodoro/PomodoroHeaderBadge';

/**
 * Menu global unico (Fase 25) - substitui o antigo `<nav>` de 2 links (Hoje/Início) do App.tsx.
 * Aparece em toda tela "de dentro de uma casa" (Hoje/Trilha/Ranking/Squad/Loja/Perfil/Projeto) -
 * a UNICA tela sem ele e o proprio mapa (WorldMapPage, `/start` sem params), que e justamente o
 * destino do botao central.
 *
 * `courseId` resolvido aqui do mesmo jeito que WorldMapPage/StartDashboard sempre fizeram (1o
 * Course Active, senao o primeiro da lista) - busca propria, mesmo padrao "self-contained" de
 * `UserMenu` (busca o catalogo so pra si, sem travar o resto do menu se falhar). Se ainda
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
 * lista - so o botao central e o `UserMenu` continuam sempre visiveis na
 * barra. Acima de `md`, layout identico ao original (3 grupos numa linha so).
 *
 * Fase 62 (Figma node 178:143): 73px de altura e texto de 16px no desktop largo (24px no Figma, reduzido a pedido do dono) (`xl`, >= 1280px -
 * abaixo disso o tamanho antigo, senao nao cabe), "Trilha do Curso" virou "Trilhas", e o canto
 * direito virou "@usuario" + avatar (`UserMenu`), que abre o menu com Perfil, Configuracoes e o
 * status da IA - os dois ultimos sairam da barra porque o Figma nao os tem (decisao do dono: mover,
 * nao remover). Altura via `--nav-height` (index.css), que as telas sem rolagem externa descontam.
 *
 * `PomodoroHeaderBadge` (Fase 36, ver secret/rascunhos/timer-pomodoro-sessao.md) - versao compacta
 * do timer Pomodoro da sessao (`PomodoroWidget`, ver useMaterialSidebar.tsx), sincronizada via
 * `lib/pomodoroTimer` (store modulo-level). So aparece depois que o aluno da play pela 1a vez -
 * nao renderiza nada fora disso, entao encaixa aqui sem `if` proprio, igual `PenaltyHeaderBadge`.
 */
export function GlobalNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const activeCourse = courses?.find((c) => c.status === CourseStatus.Active) ?? courses?.[0] ?? null;
  const courseId = activeCourse?.id ?? null;

  const trilhaHref = courseId ? `/start?course=${courseId}` : '/start';
  const rankingHref = courseId ? `/start?course=${courseId}&ranking=1` : '/start';
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-surface-alt bg-surface">
      <div className="flex h-[calc(var(--nav-height)-1px)] items-center justify-between gap-2 px-4 xl:px-16">
        {/* Desktop (md+): grupo esquerdo. */}
        <div className="hidden flex-1 items-center gap-1 md:flex xl:gap-4">
          <NavItem to="/hoje">Hoje</NavItem>
          <NavItem to={trilhaHref}>Trilhas</NavItem>
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
        <div className="hidden flex-1 items-center justify-end gap-1 md:flex xl:gap-4">
          <NavItem to="/perfil?tab=squad">Squad</NavItem>
          <NavItem to="/loja">Loja</NavItem>
          <div className="ml-2 flex shrink-0 items-center gap-2 xl:ml-4">
            <PenaltyHeaderBadge />
            <PomodoroHeaderBadge />
            <UserMenu />
          </div>
        </div>

        {/* Mobile: os badges sempre visiveis, sem o resto do grupo direito (ver menu suspenso abaixo). */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <PenaltyHeaderBadge />
          <PomodoroHeaderBadge />
          <UserMenu />
        </div>
      </div>

      {/* Mobile: menu suspenso com todos os itens em lista - fecha sozinho ao navegar. */}
      {mobileMenuOpen && (
        <div className="flex flex-col gap-1 border-t border-surface-alt p-2 md:hidden">
          <MobileNavItem to="/hoje" onNavigate={closeMobileMenu}>
            Hoje
          </MobileNavItem>
          <MobileNavItem to={trilhaHref} onNavigate={closeMobileMenu}>
            Trilhas
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
        </div>
      )}
    </nav>
  );
}

function NavItem({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="rounded-lg px-3 py-1.5 text-sm font-medium text-secondary hover:text-primary xl:text-[16px]">
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
 * Botao central - "onde o player volta pro mapa" (pedido do Falves). Emoji placeholder trocado
 * pelo PNG pixel art proprio (ver docs/fase-25) - so a versao branca (`map-white-version.png`) e
 * usada aqui, porque o app nao tem modo claro e o fundo do header (`bg-surface`) e sempre escuro;
 * `map-black-version.png` fica em assets/header sem uso por enquanto, pra quando precisar dela em
 * outro lugar. A imagem (269x64, fundo transparente) ja desenha o proprio frame/borda em pixel
 * art - sem caixa/borda extra por cima como o placeholder de emoji tinha (ficaria uma moldura
 * dobrada); so o hover (`hover:scale-105`, mesmo padrao do botao flutuante de
 * StudyAssistantWidget) sinaliza que e clicavel.
 */
function MapButton() {
  return (
    <Link
      to="/start"
      aria-label="Voltar para o mapa"
      title="Voltar para o mapa"
      className="flex shrink-0 items-center justify-center transition-transform hover:scale-105"
    >
      <img src={mapIcon} alt="Voltar para o mapa" className="h-8 w-auto xl:h-[43px]" />
    </Link>
  );
}
