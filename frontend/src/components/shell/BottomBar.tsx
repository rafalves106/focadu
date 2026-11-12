import { Link, useLocation } from 'react-router-dom';
import { activeDestination, shellLinks } from '../../lib/shellNav';
import type { ShellData } from '../../lib/useShellData';
import { AgentAvatar } from './AgentAvatar';

/**
 * Barra inferior do celular (Fase 109; Figma Nav/Barra inferior `53:121`): 64 de altura mais a área
 * segura, ícone 16 + rótulo 10. Hoje, Trilha, Squad, Ranking e "Você" (o agente, que abre o menu). No 1º
 * dia são 3 itens (Squad e Ranking somem). Só abaixo de md e fora da sessão (a sessão tem a própria
 * barra de ferramentas).
 */
export function BottomBar({ data, menuOpen, onOpenMenu }: { data: ShellData; menuOpen: boolean; onOpenMenu: () => void }) {
  const { pathname, search } = useLocation();
  const active = activeDestination(pathname, search);
  const links = shellLinks(data.courseId, data.firstDayDone);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-stroke bg-base pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-[62px] items-center justify-between px-4">
        {links.map((link) => {
          const on = link.key === active;
          return (
            <li key={link.key}>
              <Link
                to={link.to}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 text-rotulo-sm ${on ? 'text-accent' : 'text-secondary'}`}
              >
                <img src={link.icon} alt="" aria-hidden="true" className="size-4 pixelated" />
                {link.label}
                {link.key === 'squad' && data.squadRequests > 0 && (
                  <span className="absolute -top-1 right-0 bg-project px-0.5 text-rotulo-sm text-base">
                    {data.squadRequests}
                    <span className="sr-only"> pedidos de entrada</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMenu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 text-rotulo-sm ${menuOpen ? 'text-accent' : 'text-secondary'}`}
          >
            <AgentAvatar look={data.look} size={16} />
            Você
          </button>
        </li>
      </ul>
    </nav>
  );
}
