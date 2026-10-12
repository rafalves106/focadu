import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { CLAUDE_URL } from '../../lib/adminFormat';

// Fase 94, Painel de gestao: casca comum das abas (Figma PG 01-28) - titulo "GESTAO · <secao>", abas
// horizontais logo abaixo e o botao discreto "Abrir no Claude" (so um link externo, nao e chat embutido).

const TABS = [
  { to: '/gestao', label: 'Visão geral', end: true },
  { to: '/gestao/alunos', label: 'Alunos' },
  { to: '/gestao/convites', label: 'Convites' },
  { to: '/gestao/curadoria', label: 'Curadoria' },
  { to: '/gestao/uso-de-ia', label: 'Uso de IA' },
];

export function AdminShell({
  section,
  subtitle,
  context,
  actions,
  children,
}: {
  section: string;
  subtitle: string;
  /** Linha pequena a direita das abas ("TESTE FECHADO · 14 ALUNOS · SO ADMIN"). */
  context?: string;
  /** Botoes extras no topo, ao lado do "Abrir no Claude" (ex.: Visao do mes / Por aluno). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:min-h-0 lg:overflow-hidden xl:px-16">
      <header className="flex flex-wrap items-end justify-between gap-4 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-2">
          <Link to="/start" className="font-pixel-label text-[8px] text-secondary hover:text-accent">
            ← Voltar pro início
          </Link>
          <h1 className="font-pixel-label text-[20px] text-primary">Gestão · {section}</h1>
          <p className="text-[13px] text-secondary">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={CLAUDE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 border-2 border-stroke px-4 font-pixel-label text-[8px] text-secondary hover:border-secondary hover:text-primary"
          >
            Abrir no Claude ↗
          </a>
          {actions}
        </div>
      </header>

      <nav aria-label="Seções do painel" className="flex flex-wrap items-center gap-1 border-b-2 border-stroke lg:shrink-0">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `-mb-[2px] border-b-2 px-4 py-3 font-pixel-label text-[8px] ${isActive ? 'border-accent text-accent' : 'border-transparent text-secondary hover:text-primary'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        {context && <p className="ml-auto hidden font-pixel-label text-[7px] text-muted md:block">{context}</p>}
      </nav>

      <div className="flex flex-1 flex-col gap-4 lg:min-h-0">{children}</div>
    </div>
  );
}
