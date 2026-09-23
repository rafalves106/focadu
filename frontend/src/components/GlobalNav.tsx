import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus } from '../api/types';
import logoWordmark from '../assets/pixel/logo-wordmark.png';
import navHoje from '../assets/pixel/nav-hoje.png';
import navTrilhas from '../assets/pixel/nav-trilhas.png';
import navRanking from '../assets/pixel/nav-ranking.png';
import navSquad from '../assets/pixel/nav-squad.png';
import navLoja from '../assets/pixel/nav-loja.png';
import { UserMenu } from './UserMenu';

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
 * Itens em pixel art (pedido do dono, "mais proximo da gamificacao"): cada texto virou um sprite
 * 16x16 do Figma "Focadu — Pixel Art" (calendario, mapa do tesouro, podio, squad, barraca da loja).
 * O nome continua no DOM (`sr-only` + `title` = tooltip no hover) pra leitor de tela e pra quem
 * ainda nao decorou os icones; no menu suspenso do mobile vai icone + texto. 2x (32px) e 3x (48px)
 * no desktop largo, sempre escala inteira. Agrupados por modo de jogo (decisao do dono): esquerda =
 * solo (Hoje/Trilhas/Loja), direita = multiplayer (Ranking/Squad), com o logo no meio dividindo.
 *
 * Fase 68: o menu e global e unico - igual em toda tela. O conta-giros de erros e o timer Pomodoro,
 * que apareciam aqui durante a sessao (Fase 36), foram pra dentro da propria sessao diaria.
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
          <NavItem to="/hoje" icon={navHoje} label="Hoje" />
          <NavItem to={trilhaHref} icon={navTrilhas} label="Trilhas" />
          <NavItem to="/loja" icon={navLoja} label="Loja" />
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
          <NavItem to={rankingHref} icon={navRanking} label="Ranking" />
          <NavItem to="/perfil?tab=squad" icon={navSquad} label="Squad" />
          <div className="ml-2 flex shrink-0 items-center gap-2 xl:ml-4">
            <UserMenu />
          </div>
        </div>

        {/* Mobile: os badges sempre visiveis, sem o resto do grupo direito (ver menu suspenso abaixo). */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <UserMenu />
        </div>
      </div>

      {/* Mobile: menu suspenso com todos os itens em lista - fecha sozinho ao navegar. */}
      {mobileMenuOpen && (
        <div className="flex flex-col gap-1 border-t border-surface-alt p-2 md:hidden">
          <MobileNavItem to="/hoje" icon={navHoje} onNavigate={closeMobileMenu}>
            Hoje
          </MobileNavItem>
          <MobileNavItem to={trilhaHref} icon={navTrilhas} onNavigate={closeMobileMenu}>
            Trilhas
          </MobileNavItem>
          <MobileNavItem to="/loja" icon={navLoja} onNavigate={closeMobileMenu}>
            Loja
          </MobileNavItem>
          <MobileNavItem to={rankingHref} icon={navRanking} onNavigate={closeMobileMenu}>
            Ranking
          </MobileNavItem>
          <MobileNavItem to="/perfil?tab=squad" icon={navSquad} onNavigate={closeMobileMenu}>
            Squad
          </MobileNavItem>
        </div>
      )}
    </nav>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link
      to={to}
      title={label}
      className="rounded-lg p-1.5 opacity-80 transition hover:scale-110 hover:opacity-100 focus-visible:opacity-100"
    >
      <img src={icon} alt="" className="size-8 pixelated xl:size-12" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

function MobileNavItem({ to, icon, onNavigate, children }: { to: string; icon: string; onNavigate: () => void; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-secondary hover:bg-surface-alt hover:text-primary"
    >
      <img src={icon} alt="" className="size-8 pixelated" aria-hidden="true" />
      {children}
    </Link>
  );
}

/**
 * Botao central - volta pro inicio (/start). Era o PNG "START" (map-white-version.png, fase 25);
 * agora e o wordmark pixel art do Focadu (Figma "Focadu — Pixel Art", pagina Logo: o "O" e uma mira
 * de foco com cursor verde dentro). PNG 1x (35x7, fundo transparente) escalado so em inteiros com
 * `pixelated`: 4x (28px) e 6x (42px) no desktop largo - escala quebrada deixaria os pixels desiguais.
 * So o hover (`hover:scale-105`, mesmo padrao do StudyAssistantWidget) sinaliza que e clicavel.
 */
function MapButton() {
  return (
    <Link
      to="/start"
      aria-label="Focadu - voltar para o início"
      title="Voltar para o início"
      className="flex shrink-0 items-center justify-center transition-transform hover:scale-105"
    >
      <img src={logoWordmark} alt="Focadu" className="h-7 w-auto pixelated xl:h-[42px]" />
    </Link>
  );
}
