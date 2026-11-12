import type { HTMLAttributes, ReactNode } from 'react';

/** Variante do Cartão no Figma (`13:18`). Destaque: um por tela, no máximo. */
export type CardKind = 'padrao' | 'destaque' | 'ambar' | 'suave';

const KIND: Record<CardKind, string> = {
  padrao: 'border-stroke bg-surface',
  destaque: 'border-accent bg-surface shadow-[4px_4px_0_0_var(--color-accent-shadow)]',
  ambar: 'border-project bg-project-tint',
  suave: 'border-stroke bg-base',
};

const EYEBROW: Record<CardKind, string> = {
  padrao: 'text-secondary',
  destaque: 'text-accent',
  ambar: 'text-project',
  suave: 'text-secondary',
};

/**
 * Cartão do redesign v1 (Fase 109; docs/design/sistema.md §4): borda 2px, canto reto. `eyebrow` é o
 * rótulo pequeno acima do título (Rótulo/10); `title` em Pixel/Lead 24.
 */
export function Card({
  kind = 'padrao',
  eyebrow,
  title,
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLElement> & { kind?: CardKind; eyebrow?: ReactNode; title?: ReactNode }) {
  return (
    <section className={`flex flex-col gap-4 border-2 p-6 ${KIND[kind]} ${className}`} {...rest}>
      {(eyebrow || title) && (
        <header className="flex flex-col gap-2">
          {eyebrow && <p className={`text-rotulo-sm ${EYEBROW[kind]}`}>{eyebrow}</p>}
          {title && <h2 className="text-lead text-primary">{title}</h2>}
        </header>
      )}
      {children}
    </section>
  );
}
