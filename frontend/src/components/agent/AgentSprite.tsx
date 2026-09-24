import { useEffect, useState } from 'react';
import { bodySheet, frameRect, itemSheet, LAYER_SLOTS, SHEET_HEIGHT, SHEET_WIDTH, type AgentFrame, type AgentLook, type MiniDirection } from '../../lib/agentSprites';

/**
 * Agente em pixel art (Fase 71): o corpo na pele escolhida + as pecas empilhadas na ordem da pilha
 * (parte de baixo, tenis, parte de cima, cabelo). Cada camada e um recorte da folha de sprites via
 * background-position, sempre em escala inteira (`scale`) e `pixelated` - nunca borrado.
 */
export function AgentSprite({ look, frame = { view: 'frente' }, scale = 3, className = '' }: { look: AgentLook; frame?: AgentFrame; scale?: number; className?: string }) {
  const { x, y, size } = frameRect(frame);
  const sheets = [bodySheet(look.skinTone), ...LAYER_SLOTS.map((slot) => (look.layers[slot] ? itemSheet(look.layers[slot]) : undefined))];
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size * scale, height: size * scale }} aria-hidden="true">
      {sheets.map((sheet, i) =>
        sheet ? (
          <div
            key={i}
            className="absolute inset-0 pixelated"
            style={{
              backgroundImage: `url(${sheet})`,
              backgroundSize: `${SHEET_WIDTH * scale}px ${SHEET_HEIGHT * scale}px`,
              backgroundPosition: `-${x * scale}px -${y * scale}px`,
              imageRendering: 'pixelated',
            }}
          />
        ) : null,
      )}
    </div>
  );
}

const WALK: (0 | 1 | 2)[] = [0, 1, 0, 2];

/**
 * Mini do mapa andando (parado, passo A, parado, passo B em loop, 4 quadros por segundo). Com
 * `prefers-reduced-motion`, fica parado.
 */
export function WalkingAgent({ look, direction = 'baixo', scale = 3 }: { look: AgentLook; direction?: MiniDirection; scale?: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, []);
  return <AgentSprite look={look} frame={{ mini: direction, step: WALK[tick % WALK.length] }} scale={scale} />;
}
