import type { InputHTMLAttributes, ReactNode } from 'react';

/**
 * "Caixa de seleção" do redesign v1 (Fase 109; Figma `23:277`): aceite de termos e liga/desliga das
 * Configurações. A linha inteira é clicável (44px); erro pinta a caixa de vermelho.
 */
export function Checkbox({
  children,
  error = false,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { children: ReactNode; error?: boolean }) {
  return (
    <label className={`flex min-h-11 items-center gap-3 text-pequeno text-primary ${className}`}>
      <input
        type="checkbox"
        aria-invalid={error || undefined}
        className={`size-5 shrink-0 appearance-none border-2 bg-surface checked:border-accent checked:bg-accent ${error ? 'border-alert' : 'border-stroke-strong'}`}
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}
