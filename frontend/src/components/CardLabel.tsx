import type { ReactNode } from 'react';

/**
 * Rotulo de cartao do layout do Projeto Semanal (Fase 63, Figma node 178:132: "REPOSITORIO",
 * "REFERENCIAS", "DESAFIO SEMANAL", "ANOTACAO RAPIDA", "TIRA DUVIDAS") - Fira Code 10px negrito,
 * maiusculo, espacado. Componente pra o proximo layout do sistema reaproveitar o mesmo rotulo.
 */
export function CardLabel({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[1px] text-secondary">{children}</p>;
}
