import type { WorldTriggerZone } from '../../routes/world/worldConfig';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../routes/world/worldConfig';

/** Distancia acima do topo da trigger zone (raio) onde o letreiro flutua - pixels do mundo. */
const GAP_ABOVE_DOOR = 22;

/**
 * Letreiro sempre visivel sobre cada casa (Fase 25, a pedido do Falves) - so o titulo, indicando
 * pro jogador o que tem ali antes de precisar chegar perto/entrar. Posicionado direto em cima da
 * porta (centro x da trigger zone, y = topo do circulo + GAP_ABOVE_DOOR) - nao perto do telhado.
 * Distinto do DebugZoneMarker (circulo tracejado do modo "Ajustar zonas", so serve pra calibrar a
 * trigger zone contra a arte) - este aqui e UI de verdade, sempre ligado.
 */
export function HouseLabel({ zone }: { zone: WorldTriggerZone }) {
  const labelY = zone.y - zone.radius - GAP_ABOVE_DOOR;

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-stroke bg-black/70 px-2.5 py-1 text-[13.75px] font-semibold tracking-wide text-primary shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      style={{
        left: `${(zone.x / WORLD_WIDTH) * 100}%`,
        top: `${(labelY / WORLD_HEIGHT) * 100}%`,
      }}
    >
      {zone.label}
    </div>
  );
}
