import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import backArrow from '../assets/pixel/voltar.png';

/**
 * Topo das telas internas em pixel art (Fase 74, mesmo do Ranking e da visao da semana): "‹ Voltar pra
 * trilha" a esquerda e o rotulo da tela a direita.
 */
export function PixelPageHeader({ backTo, backLabel = 'Voltar pra trilha', crumb }: { backTo: string; backLabel?: string; crumb: string }) {
  return (
    <header className="flex items-center justify-between gap-3 lg:shrink-0">
      <Link to={backTo} className="flex w-fit shrink-0 items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent">
        <img src={backArrow} alt="" className="size-4 pixelated" />
        {backLabel}
      </Link>
      <p className="truncate font-pixel-label text-[9px] text-muted">{crumb}</p>
    </header>
  );
}

/** Cartao "// ROTULO" com borda de 2px (colunas laterais das telas pixel art). */
export function PixelPanel({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 border-2 border-stroke bg-base px-5 py-[18px] lg:short:py-3.5 ${className}`}>
      <h2 className="font-pixel-label text-[10px] text-accent">// {label}</h2>
      {children}
    </section>
  );
}
