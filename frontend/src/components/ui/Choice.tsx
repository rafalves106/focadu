import type { ButtonHTMLAttributes } from 'react';
import { PixelIcon } from './PixelIcon';

/**
 * "Escolha" do redesign v1 (Fase 109; Figma `23:251`): múltipla escolha e filtros (interesses,
 * linguagens, recortes, filtros do Caderninho). Alvo de toque de 44px; selecionada = fundo verde-suave,
 * borda verde e marca. Estado curto é `Chip`; resposta de quiz é a Opção de resposta.
 */
export function Choice({
  selected,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex min-h-11 items-center gap-2 border-2 px-4 text-rotulo-sm disabled:border-stroke disabled:text-muted ${
        selected ? 'border-accent bg-accent-tint text-accent' : 'border-stroke-strong text-secondary hover:border-secondary hover:text-primary'
      } ${className}`}
      {...rest}
    >
      {selected && <PixelIcon name="check" />}
      {children}
    </button>
  );
}
