import type { ReactNode } from 'react';

/**
 * Rotulo de cartao do layout do Projeto Semanal (Fase 63, Figma node 178:132: "REPOSITORIO",
 * "REFERENCIAS", "DESAFIO SEMANAL", "ANOTACAO RAPIDA", "TIRA DUVIDAS") - Fira Code 10px negrito,
 * maiusculo, espacado. Componente pra o proximo layout do sistema reaproveitar o mesmo rotulo.
 *
 * `pixel`: mesmo rotulo dos cartoes pixel art da trilha ("// Resumo do Curso" no CourseDetailPage) -
 * Silkscreen 10px em accent, com o "// " na frente.
 */
export function CardLabel({ pixel = false, children }: { pixel?: boolean; children: ReactNode }) {
  if (pixel) return <p className="font-pixel-label text-[10px] text-accent">// {children}</p>;
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[1px] text-secondary">{children}</p>;
}
