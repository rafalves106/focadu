import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

/** Tipo do botão no Figma (Botão `12:368`). */
export type ButtonKind = 'primario' | 'secundario' | 'perigo';

const KIND: Record<ButtonKind, string> = {
  primario: 'border-accent bg-accent text-base shadow-[4px_4px_0_0_var(--color-accent-shadow)] hover:border-accent-hover hover:bg-accent-hover',
  secundario: 'border-stroke-strong bg-transparent text-primary hover:border-accent hover:bg-accent-tint hover:text-accent',
  perigo: 'border-alert bg-transparent text-alert hover:bg-alert-tint',
};

const BASE = 'inline-flex h-12 shrink-0 items-center justify-center gap-2 border-2 px-6 text-rotulo transition-none';

const LOADING_DOTS: Record<ButtonKind, string> = { primario: 'bg-base', secundario: 'bg-primary', perigo: 'bg-alert' };

/**
 * Botão do redesign v1 (Fase 109; docs/design/sistema.md §4). Um Primário por tela, no fim do bloco
 * de conteúdo, alinhado à esquerda (celular: `full`). Desabilitado é cinza, nunca verde escuro.
 * `loading` troca o texto por "■■■ Aguarde" e bloqueia o clique.
 */
export function Button({
  kind = 'primario',
  loading = false,
  full = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: ButtonKind; loading?: boolean; full?: boolean }) {
  const off = disabled || loading;
  const look = disabled && !loading ? 'border-disabled bg-disabled text-muted' : KIND[kind];
  return (
    <button
      type={type}
      disabled={off}
      aria-busy={loading || undefined}
      className={`${BASE} ${look} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <span aria-hidden="true" className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`size-1.5 ${LOADING_DOTS[kind]}`} />
            ))}
          </span>
          Aguarde
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** O mesmo Botão quando a ação é ir pra outra tela (link de verdade: abre em nova aba, leitor de tela diz "link"). */
export function ButtonLink({ kind = 'primario', full = false, className = '', ...rest }: LinkProps & { kind?: ButtonKind; full?: boolean }) {
  return <Link className={`${BASE} ${KIND[kind]} ${full ? 'w-full' : ''} ${className}`} {...rest} />;
}
