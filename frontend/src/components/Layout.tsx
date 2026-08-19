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
