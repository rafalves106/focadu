import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type PixelTone = 'accent' | 'alert' | 'project' | 'muted';

const SOLID: Record<PixelTone, string> = {
  accent: 'border-accent bg-accent text-base',
  alert: 'border-alert bg-alert text-base',
  project: 'border-project bg-project text-base',
  muted: 'border-secondary bg-secondary text-base',
};

const GHOST: Record<PixelTone, string> = {
  accent: 'border-accent text-accent hover:bg-accent/10',
  alert: 'border-alert text-alert hover:bg-alert/10',
  project: 'border-project text-project hover:bg-project/10',
  muted: 'border-secondary text-secondary hover:text-primary',
};

/** Classe do botao pixel da sessao (Fase 68): caixa reta de 2px, rotulo em Silkscreen. */
function pixelButtonClass(tone: PixelTone = 'accent', ghost = false, extra = '') {
  return `inline-flex items-center justify-center gap-2 border-2 px-5 py-3 font-pixel-label text-[11px] leading-none transition hover:brightness-110 disabled:cursor-default disabled:opacity-40 disabled:hover:brightness-100 ${
    ghost ? GHOST[tone] : SOLID[tone]
  } ${extra}`;
}

export function PixelButton({
  tone = 'accent',
  ghost = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: PixelTone; ghost?: boolean }) {
  return <button type="button" {...props} className={pixelButtonClass(tone, ghost, className)} />;
}

export function PixelLink({ to, tone = 'accent', ghost = false, className = '', children }: { to: string; tone?: PixelTone; ghost?: boolean; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={pixelButtonClass(tone, ghost, className)}>
      {children}
    </Link>
  );
}

/** Chip de regra/estado ("1 TENTATIVA", "APROVADO"). */
export function PixelChip({ tone = 'muted', children }: { tone?: PixelTone; children: ReactNode }) {
  const color = { accent: 'border-accent text-accent', alert: 'border-alert text-alert', project: 'border-project text-project', muted: 'border-stroke text-secondary' }[tone];
  return <span className={`inline-flex items-center border-2 px-2.5 py-1.5 font-pixel-label text-[9px] leading-none ${color}`}>{children}</span>;
}
