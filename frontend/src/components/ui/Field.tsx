import { useId, type InputHTMLAttributes } from 'react';

/**
 * Campo do redesign v1 (Fase 109; Figma `12:395`): rótulo em Rótulo/10, caixa de 48px com borda forte,
 * foco em verde, erro em vermelho com a mensagem embaixo (em português, dizendo como corrigir).
 */
export function Field({
  label,
  error,
  hint,
  className = '',
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const noteId = `${inputId}-nota`;
  const note = error ?? hint;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-rotulo-sm text-secondary">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={`h-12 border-2 bg-surface px-4 text-corpo text-primary outline-none placeholder:text-muted focus:border-accent disabled:border-stroke disabled:text-muted ${
          error ? 'border-alert' : 'border-stroke-strong'
        }`}
        {...rest}
      />
      {note && (
        <p id={noteId} className={`text-pequeno ${error ? 'text-alert' : 'text-muted'}`}>
          {note}
        </p>
      )}
    </div>
  );
}
