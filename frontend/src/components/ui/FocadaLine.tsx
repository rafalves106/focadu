import type { ReactNode } from 'react';
import focadaNeutra from '../../assets/pixel/focada-neutra.png';
import focadaComemorando from '../../assets/pixel/focada-comemorando.png';
import focadaAcolhedora from '../../assets/pixel/focada-acolhedora.png';

/** Tom da Fala no Figma (`13:463`); cada tom já escolhe o retrato. */
export type FocadaTone = 'neutro' | 'acerto' | 'erro';

const PORTRAIT: Record<FocadaTone, string> = { neutro: focadaNeutra, acerto: focadaComemorando, erro: focadaAcolhedora };
const BORDER: Record<FocadaTone, string> = { neutro: 'border-stroke', acerto: 'border-accent', erro: 'border-alert' };
const LABEL: Record<FocadaTone, string> = { neutro: 'Focada', acerto: 'Focada · acertou', erro: 'Focada · errou' };
const LABEL_COLOR: Record<FocadaTone, string> = { neutro: 'text-accent', acerto: 'text-accent', erro: 'text-alert' };

/**
 * Fala da Focada do redesign v1 (Fase 109; docs/design/sistema.md regra 4): uma por tela, até 2 linhas.
 * `abertura` (topo do conteúdo): retrato 64 (sprite 32 em 2x) e Pixel/Corpo 20. `devolutiva` (logo
 * abaixo da resposta): retrato 32 (1x) e Pixel/Pequeno 16. Leitor de tela recebe a fala inteira.
 */
export function FocadaLine({
  tone = 'neutro',
  size = 'abertura',
  label,
  children,
  className = '',
}: {
  tone?: FocadaTone;
  /** Rótulo no lugar do padrão ("Focada · hora do quiz", "Focada · errou · 1º erro do dia"). */
  label?: string;
  size?: 'abertura' | 'devolutiva';
  children: ReactNode;
  className?: string;
}) {
  const big = size === 'abertura';
  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {big ? (
        <img src={PORTRAIT[tone]} alt="" aria-hidden="true" className="size-16 shrink-0 pixelated" />
      ) : (
        // Retrato 40 (Figma `12:142`): caixa elevada com borda e o sprite 32 em 1x no meio.
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center border-2 border-stroke bg-surface-alt">
          <img src={PORTRAIT[tone]} alt="" className="size-8 pixelated" />
        </span>
      )}
      <div role="status" aria-live="polite" className={`flex min-w-0 flex-1 flex-col gap-2 border-2 bg-surface ${big ? 'px-4 py-4' : 'px-4 py-3'} ${BORDER[tone]}`}>
        <p className={`text-rotulo-sm ${LABEL_COLOR[tone]}`}>{label ?? LABEL[tone]}</p>
        <div className={`${big ? 'text-corpo' : 'text-pequeno'} text-primary`}>{children}</div>
      </div>
    </div>
  );
}
