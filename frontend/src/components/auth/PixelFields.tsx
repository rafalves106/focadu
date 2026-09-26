import { useState, type InputHTMLAttributes } from 'react';
import { pixelField } from '../PixelModal';

/**
 * Campos de formulario das telas de entrada (Fase 74, Figma "Entrada e onboarding — v2"): rotulo em
 * Silkscreen, caixa reta de 2px e texto em VT323 - mesma classe dos modais (`pixelField`).
 */
export function PixelTextField({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-pixel-label text-[9px] text-secondary">{label}</span>
      <input {...input} className={pixelField} />
    </label>
  );
}

/** Senha com "Mostrar/Ocultar" dentro da caixa. `shown`/`onToggle` opcionais pra dois campos mostrarem juntos. */
export function PixelPasswordField({
  label,
  value,
  onChange,
  autoComplete,
  shown,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  shown?: boolean;
  onToggle?: () => void;
}) {
  const [localShown, setLocalShown] = useState(false);
  const visible = shown ?? localShown;
  return (
    <label className="flex flex-col gap-2">
      <span className="font-pixel-label text-[9px] text-secondary">{label}</span>
      <div className="flex items-center gap-3 border-2 border-stroke bg-surface px-3 py-2 focus-within:border-accent">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent font-pixel text-xl leading-snug text-primary outline-none"
        />
        <button
          type="button"
          onClick={onToggle ?? (() => setLocalShown((v) => !v))}
          className="shrink-0 font-pixel-label text-[9px] text-accent hover:brightness-110"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </label>
  );
}

/** Mensagem de erro de formulario. */
export function PixelFormError({ children }: { children: string | null }) {
  if (!children) return null;
  return <p className="font-pixel text-lg leading-snug text-alert">{children}</p>;
}
