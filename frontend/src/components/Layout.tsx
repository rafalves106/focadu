import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ScrollArea } from './ScrollArea';

/**
 * Casca das telas simples dentro do app (Ranking, Perfil, Loja, Certificacoes, Caderninho). Fase 67:
 * era uma coluna estreita (`max-w-2xl`) que rolava a janela; agora usa a largura e as margens das
 * telas pixel art (trilha, projeto, start) e, a partir de `lg`, ocupa a altura que sobra abaixo do
 * nav com o conteudo rolando por dentro (`ScrollArea`). Abaixo de `lg`, fluxo normal com rolagem da
 * pagina - ver docs/fase-61 e docs/fase-67.
 */
export function PageShell({ title, backTo, children }: { title: string; backTo?: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-6 bg-base px-4 pt-6 pb-8 lg:min-h-0 lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12">
      <header className="shrink-0">
        {backTo && (
          <Link to={backTo} className="text-sm text-secondary hover:text-accent">
            &larr; Voltar
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-semibold text-primary">{title}</h1>
      </header>
      <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="lg:pr-6">
        {children}
      </ScrollArea>
    </div>
  );
}

export function Centered({ text, tone = 'secondary' }: { text: string; tone?: 'secondary' | 'alert' }) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-height))] items-center justify-center p-6 text-center">
      <p className={tone === 'alert' ? 'text-alert' : 'text-secondary'}>{text}</p>
    </div>
  );
}
