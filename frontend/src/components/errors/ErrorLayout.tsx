import type { ReactNode } from 'react';
import type { FocadaExpression } from '../../lib/focadaLines';
import { FocadaSays } from '../session/FocadaSays';
import { PixelButton } from '../session/PixelButton';

/**
 * Chrome compartilhado pelas telas de erro e de estado vazio (Fase 10). Fase 68: pixel art - a Focada
 * explica o problema (no lugar do emoji num frame arredondado), titulo em VT323, rotulo em Silkscreen e
 * botoes pixel. Altura = o que sobra abaixo do menu, pra nunca criar rolagem externa dentro do app.
 */
export function ErrorLayout({
  expression = 'acolhedora',
  caption,
  title,
  description,
  primaryAction,
  secondaryAction,
  extra,
}: {
  expression?: FocadaExpression;
  /** Rotulo pequeno acima do titulo, ex: "ERRO 500" - opcional. */
  caption?: string;
  title: string;
  description: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Conteudo extra entre a fala e os botoes (ex: carregando do TimeoutError). */
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-height))] flex-col items-center justify-center bg-base px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <p className="font-pixel-label text-[9px] text-alert">// {caption ?? 'Ops'}</p>
        <h1 className="font-pixel text-4xl leading-none text-primary uppercase">{title}</h1>
        <FocadaSays expression={expression} size="lg">
          {description}
        </FocadaSays>
        {extra}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {secondaryAction && (
            <PixelButton ghost tone="muted" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </PixelButton>
          )}
          <PixelButton onClick={primaryAction.onClick}>{primaryAction.label} ›</PixelButton>
        </div>
      </div>
    </div>
  );
}
