import type { WorldTriggerZone } from '../../routes/world/worldConfig';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../routes/world/worldConfig';

/**
 * Letreiro sempre visivel sobre cada casa (Fase 25, a pedido do Falves) - so o titulo, indicando
 * pro jogador o que tem ali antes de precisar chegar perto/entrar. Distinto do DebugZoneMarker
 * (circulo tracejado do modo "Ajustar zonas", so serve pra calibrar a trigger zone contra a arte) -
 * este aqui e UI de verdade, sempre ligado.
 */
export function HouseLabel({ zone }: { zone: WorldTriggerZone }) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-stroke bg-black/70 px-2 py-1 text-[11px] font-semibold tracking-wide text-primary shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      style={{
        left: `${(zone.x / WORLD_WIDTH) * 100}%`,
        top: `${(zone.labelY / WORLD_HEIGHT) * 100}%`,
      }}
    >
      {zone.label}
    </div>
  );
}
