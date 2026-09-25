import type { ReactNode } from 'react';

/**
 * Palco pixel (Fase 72, Figma "Perfil + Squad — v2"): holofote verde em degraus vindo de cima e o
 * piso em linhas que vao sumindo - usado atras do agente no Perfil e da escalacao no QG do Squad.
 * Tudo decorativo (`aria-hidden`); o conteudo vai por cima.
 */
export function PixelStage({ className = '', floor = 'bottom-10', steps = 10, children }: { className?: string; floor?: string; steps?: number; children: ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center">
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className="block flex-1 bg-accent/5" style={{ width: `${18 + i * (72 / steps)}%` }} />
        ))}
      </div>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 flex flex-col ${floor}`}>
        <span className="h-0.5 bg-stroke" />
        <span className="mt-1.5 h-0.5 bg-stroke/80" />
        <span className="mt-2.5 h-0.5 bg-stroke/60" />
        <span className="mt-4 h-0.5 bg-stroke/40" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Rotulo "// TITULO" dos cartoes pixel. */
export function PanelLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-pixel-label text-[10px] text-accent">// {children}</h2>
      {aside}
    </div>
  );
}
