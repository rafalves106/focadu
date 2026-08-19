import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function PageShell({ title, backTo, children }: { title: string; backTo?: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl p-6">
      {backTo && (
        <Link to={backTo} className="text-sm text-secondary hover:text-accent">
          &larr; Voltar
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-semibold text-primary">{title}</h1>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function Centered({ text, tone = 'secondary' }: { text: string; tone?: 'secondary' | 'alert' }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className={tone === 'alert' ? 'text-alert' : 'text-secondary'}>{text}</p>
    </div>
  );
}

/** Shell compartilhado pelas telas de atividade (Quiz, WordMatch, Cloze, Roleplay) - eyebrow + título + conteúdo centralizado. */
export function ActivityScreen({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-secondary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold text-primary">{title}</h1>
      </div>
      {children}
    </div>
  );
}
