/** Ícones do redesign v1 (Fase 109; Figma Ícone `12:323`), desenhados na grade: `#` = pixel aceso. */
const GRIDS = {
  check: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  lock: ['.####.', '#....#', '#....#', '######', '##.###', '##.###', '######'],
  play: ['#.....', '###...', '#####.', '######', '#####.', '###...', '#.....'],
  code: ['.#....#.', '#......#', '.#....#.'],
  castle: ['#.#.#.#.#', '#########', '#.......#', '#..###..#', '#..#.#..#', '#..###..#', '#########'],
  /** "Check de hoje não feito": quadrado vazio. */
  pendente: ['######', '#....#', '#....#', '#....#', '#....#', '######'],
} as const;

export type PixelIconName = keyof typeof GRIDS;

/** Tamanho do pixel no Figma: 2 px em tudo, 3 px no castelo do Nó de dia. */
const DEFAULT_SCALE: Record<PixelIconName, number> = { check: 2, lock: 2, play: 2, code: 2, castle: 3, pendente: 2 };

/**
 * Ícone pixel em SVG (cor = `currentColor`, então a cor vem da classe de texto). Nunca rotacionado,
 * nunca em escala quebrada: `scale` é o tamanho de cada pixel em px.
 */
export function PixelIcon({ name, scale, className = '' }: { name: PixelIconName; scale?: number; className?: string }) {
  const rows = GRIDS[name];
  const px = scale ?? DEFAULT_SCALE[name];
  const width = rows[0].length;
  return (
    <svg
      aria-hidden="true"
      width={width * px}
      height={rows.length * px}
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
    >
      {rows.flatMap((row, y) => [...row].map((cell, x) => (cell === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}
