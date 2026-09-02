import { useEffect, useRef, useState } from 'react';
import type { WorldTriggerZone } from './worldConfig';

type Direction = 'up' | 'down' | 'left' | 'right';

/** Cada tecla mapeia pra um vetor (dx, dy) - varias pressionadas juntas somam e normalizam (diagonal nao anda mais rapido). */
const MOVE_VECTORS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

/** Pixels do mundo por segundo. */
const SPEED = 260;

/**
 * `event.key` vem maiusculo com Caps Lock ligado (ou Shift segurado) - "W"/"A"/"S"/"D" nao batiam
 * com as entradas minusculas de `MOVE_VECTORS` e o movimento parava silenciosamente (bug real,
 * reproduzido - setas continuavam funcionando por nao serem letras, so o WASD "sumia"). So letras
 * unicas precisam de normalizacao - `ArrowUp` etc ja sao inequivocas, tocar nelas so arriscaria
 * introduzir um bug novo a toa.
 */
function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

/**
 * Loop de movimento do personagem no mapa (Fase 25) - teclado (setas/WASD) + requestAnimationFrame,
 * sem colisao contra predio (decisao da fase: so as 5 trigger zones das portas importam). `position`
 * e `facing` re-renderizam o chamador a cada frame com tecla pressionada (aceitavel - o mapa e a
 * unica coisa pesada na tela, sem lista/tabela grande por perto).
 */
export function useWorldMovement({
  start,
  bounds,
  zones,
  onEnterZone,
}: {
  start: { x: number; y: number };
  bounds: { width: number; height: number };
  zones: WorldTriggerZone[];
  /** Recebe a posicao exata (nao a do render anterior) - `WorldMapPage` usa isso pra salvar a
      posicao de saida sem depender do state `position` (1 frame atrasado em relacao ao `next`
      calculado aqui, uma corrida irrelevante pro movimento mas nao pra persistencia exata). */
  onEnterZone: (zone: WorldTriggerZone, position: { x: number; y: number }) => void;
}) {
  const [position, setPosition] = useState(start);
  const [facing, setFacing] = useState<Direction>('down');

  const positionRef = useRef(start);
  const pressedRef = useRef(new Set<string>());
  const triggeredZoneIdRef = useRef<string | null>(null);
  // Refs pra `onEnterZone`/`zones` nao forcarem o loop a reiniciar a cada render (o loop so pode
  // depender de coisas que nunca mudam depois do mount, senao listener de teclado pisca).
  const onEnterZoneRef = useRef(onEnterZone);
  const zonesRef = useRef(zones);
  onEnterZoneRef.current = onEnterZone;
  zonesRef.current = zones;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const key = normalizeKey(event.key);
      if (!(key in MOVE_VECTORS)) return;
      pressedRef.current.add(key);
      event.preventDefault();
    }
    function handleKeyUp(event: KeyboardEvent) {
      pressedRef.current.delete(normalizeKey(event.key));
    }
    // Alt-tab/troca de janela com tecla segurada nunca dispara keyup - sem isso o personagem
    // ficaria andando sozinho depois que a aba voltasse a ficar visivel.
    function clearPressed() {
      pressedRef.current.clear();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearPressed);

    let rafId: number;
    let lastTime = performance.now();

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      let dx = 0;
      let dy = 0;
      for (const key of pressedRef.current) {
        const vector = MOVE_VECTORS[key];
        dx += vector[0];
        dy += vector[1];
      }

      if (dx !== 0 || dy !== 0) {
        const length = Math.hypot(dx, dy) || 1;
        const next = {
          x: Math.min(Math.max(positionRef.current.x + (dx / length) * SPEED * dt, 0), bounds.width),
          y: Math.min(Math.max(positionRef.current.y + (dy / length) * SPEED * dt, 0), bounds.height),
        };
        positionRef.current = next;
        setPosition(next);
        setFacing(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');

        const hitZone = zonesRef.current.find((zone) => Math.hypot(zone.x - next.x, zone.y - next.y) <= zone.radius);
        if (hitZone) {
          if (triggeredZoneIdRef.current !== hitZone.id) {
            triggeredZoneIdRef.current = hitZone.id;
            onEnterZoneRef.current(hitZone, next);
          }
        } else {
          triggeredZoneIdRef.current = null;
        }
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearPressed);
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.width, bounds.height]);

  return { position, facing };
}
