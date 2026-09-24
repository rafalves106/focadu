import type { ReactNode } from 'react';
import focadaNeutra from '../../assets/pixel/focada-neutra.png';
import focadaComemorando from '../../assets/pixel/focada-comemorando.png';
import focadaAcolhedora from '../../assets/pixel/focada-acolhedora.png';
import type { FocadaExpression } from '../../lib/focadaLines';

const PORTRAITS: Record<FocadaExpression, string> = {
  neutra: focadaNeutra,
  comemorando: focadaComemorando,
  acolhedora: focadaAcolhedora,
};

const BORDER = { metal: 'border-secondary', accent: 'border-accent', alert: 'border-alert', project: 'border-project' } as const;
const LABEL = { metal: 'text-accent', accent: 'text-accent', alert: 'text-alert', project: 'text-project' } as const;
/** Retrato 32x32 sempre em escala inteira (2x, 3x, 4x). */
const SIZE = { sm: 'size-16', md: 'size-24', lg: 'size-32' } as const;
const TEXT = { sm: 'text-lg leading-[1.15]', md: 'text-xl leading-[1.15]', lg: 'text-2xl leading-[1.15]' } as const;

/**
 * Fala estatica da Focada na sessao diaria (Fase 68) - retrato + caixa, mesma linguagem do dialogo do
 * Projeto Semanal (DialogueBox), sem a digitacao letra a letra: na sessao ela reage a cada etapa e a
 * digitacao atrasaria o aluno. Leitor de tela recebe a fala inteira (aria-live).
 */
export function FocadaSays({
  expression = 'neutra',
  label = 'Focada',
  children,
  size = 'md',
  tone = 'metal',
  stacked = false,
  className = '',
}: {
  expression?: FocadaExpression;
  label?: string;
  children: ReactNode;
  size?: keyof typeof SIZE;
  tone?: keyof typeof BORDER;
  /** Coluna estreita (perfil, Fase 70): retrato em cima e a fala solta embaixo, sem a caixa. */
  stacked?: boolean;
  className?: string;
}) {
  if (stacked) {
    return (
      <div className={`flex min-w-0 flex-col gap-3 ${className}`}>
        <div className="flex w-fit items-center justify-center border-2 border-stroke bg-base p-1">
          <img src={PORTRAITS[expression]} alt="Focada" className={`${SIZE[size]} pixelated`} />
        </div>
        <div className={`font-pixel text-primary ${TEXT[size]}`} aria-live="polite">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex min-w-0 items-stretch gap-3 ${className}`}>
      <div className={`flex shrink-0 items-center justify-center self-start border-2 bg-base p-1 ${BORDER[tone]}`}>
        <img src={PORTRAITS[expression]} alt="Focada" className={`${SIZE[size]} pixelated`} />
      </div>
      <div className={`flex min-w-0 flex-1 flex-col gap-1.5 border-2 bg-base px-4 py-3 ${BORDER[tone]}`} aria-live="polite">
        <p className={`font-pixel-label text-[9px] ${LABEL[tone]}`}>{label}</p>
        <div className={`font-pixel text-primary ${TEXT[size]}`}>{children}</div>
      </div>
    </div>
  );
}
