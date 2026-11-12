import { Link } from 'react-router-dom';
import type { DayNodeState, PathNode } from '../../lib/weekPath';
import { PixelIcon } from '../ui/PixelIcon';

const BOX: Record<DayNodeState, string> = {
  trancado: 'size-10 border-stroke bg-surface text-muted',
  disponivel: 'size-10 border-stroke-strong bg-surface text-primary',
  atual: 'size-10 border-accent bg-accent-tint text-accent',
  feito: 'size-10 border-accent bg-accent text-base',
  'feito-reforco': 'size-10 border-accent bg-accent text-base',
  code: 'size-10 border-project bg-surface text-project',
  'castelo-trancado': 'size-12 border-stroke bg-surface text-muted',
  'castelo-aberto': 'size-12 border-project bg-project-tint text-project',
};

const LABEL: Record<DayNodeState, string> = {
  trancado: 'text-muted',
  disponivel: 'text-secondary',
  atual: 'text-accent',
  feito: 'text-secondary',
  'feito-reforco': 'text-secondary',
  code: 'text-project',
  'castelo-trancado': 'text-project',
  'castelo-aberto': 'text-project',
};

/**
 * Nó de dia do redesign v1 (Fase 109; Figma `12:638`): um Dia na trilha, na visão da semana e no caminho
 * da semana do Início. 40x40 (castelo 48). Feito com reforço ganha o ponto âmbar no canto (pendência,
 * nunca vermelho); o code comigo tem borda âmbar e o ícone `<>`. Clique abre o Dia (ou o projeto).
 * `focusable={false}`: nó sem link próprio, quando a linha inteira já leva ao mesmo lugar.
 */
export function DayNode({ node, focusable = true }: { node: PathNode; focusable?: boolean }) {
  const body = (
    <>
      <span className="relative block">
        <span className={`flex items-center justify-center border-2 ${BOX[node.state]}`}>
          <NodeGlyph node={node} />
        </span>
        {node.state === 'feito-reforco' && <span className="absolute top-[-4px] left-[34px] size-2.5 bg-project" aria-hidden="true" />}
      </span>
      <span className={`text-rotulo-sm whitespace-nowrap ${LABEL[node.state]}`}>{node.label}</span>
    </>
  );
  const cls = 'flex shrink-0 flex-col items-center gap-1 outline-offset-2';
  if (node.to && focusable) {
    return (
      <Link to={node.to} aria-label={node.title} title={node.title} className={`${cls} hover:brightness-125`}>
        {body}
      </Link>
    );
  }
  return (
    <span role="img" aria-label={node.title} title={node.title} className={cls}>
      {body}
    </span>
  );
}

function NodeGlyph({ node }: { node: PathNode }) {
  switch (node.state) {
    case 'trancado':
      return <PixelIcon name="lock" />;
    case 'disponivel':
      return <span className="text-rotulo">{node.dayNumber}</span>;
    case 'atual':
      return <PixelIcon name="play" />;
    case 'feito':
    case 'feito-reforco':
      return <PixelIcon name="check" />;
    case 'code':
      return <PixelIcon name="code" />;
    default:
      return <PixelIcon name="castle" />;
  }
}
