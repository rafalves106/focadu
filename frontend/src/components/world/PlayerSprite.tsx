/**
 * Placeholder do personagem (Fase 25) - sem asset de verdade ainda (ver docs/fase-25), so uma
 * bolinha + sombra + uma cunha indicando a direcao. Trocar por spritesheet de verdade e so
 * substituir o conteudo interno deste componente - a logica de posicao/movimento (useWorldMovement)
 * nao muda nada.
 */
export function PlayerSprite({
  leftPercent,
  topPercent,
  facing,
}: {
  leftPercent: number;
  topPercent: number;
  facing: 'up' | 'down' | 'left' | 'right';
}) {
  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
    >
      <div className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-base bg-accent shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
        <span
          aria-hidden="true"
          className="absolute h-0 w-0 border-[5px] border-transparent"
          style={directionArrowStyle(facing)}
        />
      </div>
      <div className="mt-0.5 h-1.5 w-4 rounded-full bg-black/50 blur-[1px]" />
    </div>
  );
}

function directionArrowStyle(facing: 'up' | 'down' | 'left' | 'right') {
  // Triangulo (via border trick) apontando pra direcao que o personagem esta olhando.
  switch (facing) {
    case 'up':
      return { borderBottomColor: '#0a0a0a', transform: 'translateY(-6px)' };
    case 'down':
      return { borderTopColor: '#0a0a0a', transform: 'translateY(6px)' };
    case 'left':
      return { borderRightColor: '#0a0a0a', transform: 'translateX(-6px)' };
    case 'right':
      return { borderLeftColor: '#0a0a0a', transform: 'translateX(6px)' };
  }
}
