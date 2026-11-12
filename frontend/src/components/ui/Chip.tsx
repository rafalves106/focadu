import type { ReactNode } from 'react';

/** Tom do Chip no Figma (`12:377`). Vermelho só pra erro na hora. */
export type ChipTone = 'neutro' | 'verde' | 'ambar' | 'vermelho';

const TONE: Record<ChipTone, string> = {
  neutro: 'border-stroke text-secondary',
  verde: 'border-accent text-accent',
  ambar: 'border-project text-project',
  vermelho: 'border-alert text-alert',
};

/**
 * Chip do redesign v1 (Fase 109): estado curto ("+3", "Reforço pendente", "Feito"). No máximo dois lado
 * a lado; não serve pra toque (26px de altura) — filtro e escolha usam `Choice`.
 */
export function Chip({ tone = 'neutro', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center gap-1 border-2 px-2 py-1 text-rotulo-sm ${TONE[tone]}`}>{children}</span>;
}
