import { isDone, type PathNode } from '../../lib/weekPath';
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
                className={`mt-[19px] h-0.5 ${fill ? 'min-w-2 flex-1' : 'min-w-1 flex-1 lg:w-5 lg:flex-none'} ${isDone(node.state) ? 'bg-accent' : 'bg-stroke'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
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
          <span key={n.key} className={`h-1.5 flex-1 ${isDone(n.state) ? 'bg-accent' : n.state === 'atual' ? 'bg-accent-hover' : 'bg-stroke'}`} />
        ))}
      </span>
      {castle && <PixelIcon name="castle" scale={2} className={castle.state === 'castelo-aberto' ? 'text-project' : 'text-muted'} />}
    </div>
  );
}
