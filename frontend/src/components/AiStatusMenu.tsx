import { useEffect, useState } from 'react';
import { useAiStatus, type AiHealth } from '../lib/useAiStatus';
import iaSheet from '../assets/pixel/nav-ia.png';

/** Quadro da folha `nav-ia.png` (128×16, gerada por secret/curadoria/scripts/icones/ia.js) por estado. */
const FRAME: Record<AiHealth, number> = { ok: 0, degraded: 1, down: 2, unset: 3, unknown: 3 };
const CHECKING_FRAMES = [4, 5, 6, 7];

const TITLE: Record<AiHealth, string> = {
  ok: 'IA operacional',
  degraded: 'IA parcial',
  down: 'IA fora do ar',
  unset: 'IA não configurada',
  unknown: 'IA sem resposta',
};

/**
 * Status da IA no menu global (24/09/2026, pedido do dono): robozinho 16×16 que troca de cor com o
 * estado - verde operacional, ambar parcial, vermelho fora do ar, cinza desligado/sem resposta - e
 * anima (antena piscando, barrinha correndo na boca, 4 quadros a 150ms) enquanto consulta, inclusive
 * no polling de 45s. Clique roda a consulta na hora; sem painel de detalhe (o estado esta no proprio
 * robo e no tooltip).
 */
export function AiStatusMenu() {
  const status = useAiStatus();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!status.checking || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 150);
    return () => window.clearInterval(id);
  }, [status.checking]);

  const frame = status.checking ? CHECKING_FRAMES[tick % CHECKING_FRAMES.length] : FRAME[status.health];
  const label = status.checking ? 'Consultando a IA...' : `${TITLE[status.health]} - clique pra consultar de novo`;

  return (
    <button
      type="button"
      onClick={status.refresh}
      disabled={status.checking}
      title={label}
      className="block rounded-lg p-1.5 opacity-80 transition hover:scale-110 hover:opacity-100 focus-visible:opacity-100 disabled:cursor-progress disabled:hover:scale-100"
    >
      <SheetFrame frame={frame} scale={2} className="xl:hidden" />
      <SheetFrame frame={frame} scale={3} className="hidden xl:block" />
      <span className="sr-only" aria-live="polite">
        {label}
      </span>
    </button>
  );
}

function SheetFrame({ frame, scale, className }: { frame: number; scale: number; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pixelated ${className}`}
      style={{
        width: 16 * scale,
        height: 16 * scale,
        backgroundImage: `url(${iaSheet})`,
        backgroundSize: `${128 * scale}px ${16 * scale}px`,
        backgroundPosition: `-${frame * 16 * scale}px 0`,
        imageRendering: 'pixelated',
      }}
    />
  );
}
