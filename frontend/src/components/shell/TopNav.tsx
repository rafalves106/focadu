import { Link, useLocation } from 'react-router-dom';
import logoWordmark from '../../assets/pixel/logo-wordmark.png';
import { activeDestination, shellLinks } from '../../lib/shellNav';
import type { AiHealth } from '../../lib/useAiStatus';
import type { ShellData } from '../../lib/useShellData';
import { AgentAvatar } from './AgentAvatar';

/**
 * Nav superior do redesign v1 (Fase 109; Figma Nav/Desktop `53:103`). Desktop e notebook (md+): logo à
 * esquerda, destinos com rótulo no centro (Hoje · Trilha · Squad · Ranking, sem ícone: o rótulo é o
 * ícone) e o agente à direita, que abre o menu do agente. No 1º dia: Squad e Ranking somem e o agente
 * fica sem os números. Celular: só o logo e o agente (os destinos vão pra barra inferior).
 *
 * Sem "?", sem engrenagem, sem robozinho da IA: ajuda e configurações moram no menu do agente, e o
 * status da IA é o ponto no avatar (só aparece aqui quando a IA não está 100%; o menu mostra sempre).
 */
export function TopNav({
  data,
  health,
  menuOpen,
  onOpenMenu,
}: {
  data: ShellData;
  health: AiHealth | null;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const { pathname, search } = useLocation();
  const active = activeDestination(pathname, search);
  const links = shellLinks(data.courseId, data.firstDayDone);
  const showNumbers = data.firstDayDone && data.gems !== null && data.streak !== null;
  const dot = health && health !== 'ok' ? health : undefined;

  return (
    <nav aria-label="Principal" className="sticky top-0 z-30 h-[var(--nav-height)] shrink-0 border-b-2 border-stroke bg-base">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:px-6 min-[1400px]:px-8">
        <Link to="/start" aria-label="Focadu, ir para o Início" className="justify-self-start">
          <img src={logoWordmark} alt="Focadu" className="h-[21px] w-[105px] pixelated" />
        </Link>

        <ul className="hidden items-stretch gap-2 md:flex">
          {links.map((link) => {
            const on = link.key === active;
            return (
              <li key={link.key}>
                <Link
                  to={link.to}
                  aria-current={on ? 'page' : undefined}
                  className={`relative flex h-[calc(var(--nav-height)-2px)] flex-col items-center justify-center gap-2 px-4 text-rotulo ${on ? 'text-accent' : 'text-secondary hover:text-primary'}`}
                >
                  {/* Indicador de 4px embaixo do rótulo (transparente fora do ativo, pra não pular). */}
                  <span>{link.label}</span>
                  <span className={`h-1 w-full ${on ? 'bg-accent' : ''}`} aria-hidden="true" />
                  {link.key === 'squad' && data.squadRequests > 0 && (
                    <span className="absolute top-2 right-0 bg-project px-1 text-rotulo-sm text-base">
                      {data.squadRequests}
                      <span className="sr-only"> pedidos de entrada</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onOpenMenu}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-label={data.look === null ? 'Abrir o menu do agente (você ainda não criou seu agente)' : 'Abrir o menu do agente'}
          className={`flex items-center gap-2 justify-self-end border-2 px-2 py-1 ${menuOpen ? 'border-accent' : 'border-stroke hover:border-stroke-strong'}`}
        >
          <AgentAvatar look={data.look} size={32} health={dot} />
          {showNumbers && (
            <span className="hidden items-center gap-2 text-rotulo-sm md:flex">
              <span className="text-accent">{data.gems} gems</span>
              <span className="text-project">
                {data.streak} {data.streak === 1 ? 'dia' : 'dias'}
              </span>
            </span>
          )}
          <span className="hidden text-rotulo-sm text-muted md:inline" aria-hidden="true">
            v
          </span>
        </button>
      </div>
    </nav>
  );
}
