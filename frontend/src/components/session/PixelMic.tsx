/** Grade 16x16 do microfone (Fase 68, Figma "Daily — redesign proposto"). K contorno, A corpo, H brilho. */
const GRID = [
  '................',
  '......KKKK......',
  '.....KAAAAK.....',
  '.....KHAAAK.....',
  '.....KAAAAK.....',
  '.....KAAAAK.....',
  '.....KAAAAK.....',
  '...K.KAAAAK.K...',
  '...K..KKKK..K...',
  '...KK......KK...',
  '....KK....KK....',
  '......KKKK......',
  '.......KK.......',
  '.......KK.......',
  '.....KKKKKK.....',
  '................',
];

const PALETTE = {
  idle: { K: '#1c9e3e', A: '#39ff6a', H: '#f5f5f5' },
  recording: { K: '#a61e1e', A: '#ff3b3b', H: '#f5f5f5' },
};

/** Sprite do microfone em SVG (sem PNG: sao 2 paletas do mesmo desenho). Tamanho em multiplo de 16. */
export function PixelMic({ recording = false, className = 'size-24' }: { recording?: boolean; className?: string }) {
  const colors = PALETTE[recording ? 'recording' : 'idle'];
  return (
    <svg viewBox="0 0 16 16" className={className} shapeRendering="crispEdges" aria-hidden="true">
      {GRID.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[ch as 'K' | 'A' | 'H']} />,
        ),
      )}
    </svg>
  );
}
