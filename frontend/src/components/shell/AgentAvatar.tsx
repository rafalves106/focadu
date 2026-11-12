import type { AgentLook } from '../../lib/agentSprites';
import { AI_DOT, AI_SHORT } from '../../lib/aiStatusText';
import type { AiHealth } from '../../lib/useAiStatus';
import { AgentSprite } from '../agent/AgentSprite';

const DOT_SIZE: Record<16 | 32 | 64, string> = { 16: 'size-1.5 -top-1 -right-1', 32: 'size-2 -top-1 -right-1', 64: 'size-3 top-0 right-0' };

/**
 * Avatar do agente na casca do redesign v1 (Fase 109): 16 = mini (barra inferior, item Perfil), 32 = de
 * frente 1x (nav), 64 = de frente 2x (menu do agente). Sem agente criado: contorno tracejado VERDE do
 * mesmo tamanho (decisão do dono, sistema.md §11 item 4), que convida a criar. `health` acende o ponto
 * do status da IA no canto.
 */
export function AgentAvatar({ look, size, health }: { look: AgentLook | null | undefined; size: 16 | 32 | 64; health?: AiHealth }) {
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      {look ? (
        size === 16 ? (
          <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={1} />
        ) : (
          <AgentSprite look={look} scale={size / 32} />
        )
      ) : look === null ? (
        <span className="block size-full border-2 border-dashed border-accent" aria-hidden="true" />
      ) : null}
      {health && (
        <span className={`absolute ${DOT_SIZE[size]} ${AI_DOT[health]}`} role="img" aria-label={AI_SHORT[health]} title={AI_SHORT[health]} />
      )}
    </span>
  );
}
