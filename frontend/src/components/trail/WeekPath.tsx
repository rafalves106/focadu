import { isDone, type PathNode, type RoomMark } from '../../lib/weekPath';
import { PixelIcon } from '../ui/PixelIcon';
import { DayNode } from './DayNode';

/**
 * Os Nós de dia de uma semana ligados por um traço (Fase 109): verde depois de um Dia feito, cinza no
 * resto. `fill` estica os traços até a largura do cartão (caminho da semana do Início); sem ele, traços
 * curtos de 20 px a partir de `lg` (linhas da Trilha) e esticados abaixo disso, pra caber no celular.
 */
export function WeekPath({ nodes, label, fill = false }: { nodes: PathNode[]; label: string; fill?: boolean }) {
  return (
    <ol className={`flex items-start ${fill ? 'w-full' : 'w-full lg:w-auto'}`} aria-label={label}>
      {nodes.map((node, i) => {
        const last = i === nodes.length - 1;
        return (
          <li key={node.key} className={`flex items-start ${last ? '' : fill ? 'flex-1' : 'flex-1 lg:flex-initial'}`}>
            <DayNode node={node} />
            {!last && (
              <span
                aria-hidden="true"
                className={`relative mt-[19px] h-0.5 ${fill ? 'min-w-2 flex-1' : 'min-w-1 flex-1 lg:w-5 lg:flex-none'} ${node.room ? 'min-w-4' : ''} ${isDone(node.state) ? 'bg-accent' : 'bg-stroke'}`}
              >
                {node.room && <RoomMarkBox mark={node.room} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const MARK: Record<RoomMark, string> = {
  feita: 'border-accent bg-accent',
  pendente: 'border-project bg-project',
  trancada: 'border-stroke bg-surface',
};

/**
 * Marca de sala (Fase 112; Figma `97-9586`): quadrado de 12 px no traço que sai de cada sessão. Verde feita, âmbar
 * pendente, contorno trancada. Some no curso Daily (nó sem `room`).
 */
export function RoomMarkBox({ mark, small = false, className = '' }: { mark: RoomMark; small?: boolean; className?: string }) {
  return <span aria-hidden="true" className={`block shrink-0 border-2 ${small ? 'size-2' : 'size-3'} ${MARK[mark]} ${className}`} />;
}

/**
 * Caminho da semana no celular (Fase 109; Figma `15:833`): um segmento de 6 px por Dia (Etapa/Segmento
 * `12:430`: feito verde, atual verde claro, resto cinza) e o castelo do projeto no fim.
 */
export function WeekSegments({ nodes, label }: { nodes: PathNode[]; label: string }) {
  const days = nodes.filter((n) => n.dayNumber !== null);
  const castle = nodes.find((n) => n.dayNumber === null);
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${label}: ${nodes.map((n) => n.title).join('; ')}`}>
      <span className="flex flex-1 gap-1">
        {days.map((n) => (
          <span key={n.key} className="flex flex-1 items-center gap-1">
            <span className={`h-1.5 flex-1 ${isDone(n.state) ? 'bg-accent' : n.state === 'atual' ? 'bg-accent-hover' : 'bg-stroke'}`} />
            {n.room && <RoomMarkBox mark={n.room} small />}
          </span>
        ))}
      </span>
      {castle && <PixelIcon name="castle" scale={2} className={castle.state === 'castelo-aberto' ? 'text-project' : 'text-muted'} />}
    </div>
  );
}
