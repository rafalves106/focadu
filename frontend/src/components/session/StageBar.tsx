import { ActivityStatus, type DailyStateDto } from '../../api/types';
import { sessionStages, stageLabel } from '../../lib/sessionSteps';
import { PixelIcon } from '../ui/PixelIcon';

type NodeState = 'feita' | 'atual' | 'futura';

/** Quantos nós cabem na coluna de foco (720) sem estourar; o resto vira o Chip "+N" (sistema.md §4, Etapa/Nó). */
const MAX_NODES = 8;

/**
 * Janela de até 8 nós (Figma `17:753`): começa no 1º e só anda quando a etapa atual passa do 7º nó, pra
 * sempre sobrar um nó à frente. Fora da janela: "+N" na ponta de cada lado.
 */
function nodeWindow(count: number, current: number): { start: number; end: number } {
  if (count <= MAX_NODES) return { start: 0, end: count };
  const anchor = current < 0 ? count - 1 : current;
  const start = Math.min(Math.max(anchor - (MAX_NODES - 2), 0), count - MAX_NODES);
  return { start, end: start + MAX_NODES };
}

function stageStates(daily: DailyStateDto, activityId: string | null, allDone: boolean): NodeState[] {
  return sessionStages(daily).map((stage) => {
    if (allDone) return 'feita';
    if (stage.activities.some((a) => a.id === activityId)) return 'atual';
    return stage.activities.every((a) => a.status === ActivityStatus.Completed) ? 'feita' : 'futura';
  });
}

/**
 * Barra de etapas da sessão (redesign v1, Fase 109 etapa 4; Figma Etapa/Nó `12:426` e Etapa/Segmento
 * `12:430`). Uma etapa = um bloco de atividades seguidas do mesmo tipo (`sessionStages`). A partir de md:
 * nós de 32 ligados por traço (verde depois de etapa feita), rótulo embaixo, até 8 nós e o Chip "+N".
 * No celular: um segmento de 6 px por etapa e, embaixo, "Tipo · Pergunta k de n" (`caption`).
 */
export function StageBar({
  daily,
  activityId,
  allDone = false,
  caption,
}: {
  daily: DailyStateDto;
  activityId: string | null;
  allDone?: boolean;
  /** Texto do celular embaixo dos segmentos ("Quiz · Pergunta 1 de 3"). */
  caption?: string;
}) {
  const stages = sessionStages(daily);
  const states = stageStates(daily, activityId, allDone);
  const current = states.indexOf('atual');
  const { start, end } = nodeWindow(stages.length, current);

  return (
    <>
      <ol className="hidden min-w-0 items-start md:flex" aria-label="Etapas do dia">
        {start > 0 && <MoreChip count={start} label={`${start} etapas antes`} first />}
        {stages.slice(start, end).map((stage, k) => {
          const i = start + k;
          const state = states[i];
          const last = i === end - 1 && end === stages.length;
          return (
            <li key={stage.activities[0].id} className={`flex min-w-0 items-start ${last ? '' : 'flex-1'}`}>
              <div className="flex w-8 shrink-0 flex-col items-center gap-2" aria-label={`Etapa ${i + 1}, ${stageLabel(daily, stages, i)}: ${state}`}>
                <span
                  className={`flex size-8 items-center justify-center border-2 text-rotulo-sm ${
                    state === 'feita'
                      ? 'border-accent bg-accent text-base'
                      : state === 'atual'
                        ? 'border-accent bg-base text-accent'
                        : 'border-stroke bg-surface text-muted'
                  }`}
                >
                  {state === 'feita' ? <PixelIcon name="check" /> : i + 1}
                </span>
                <span className={`whitespace-nowrap text-[8px] leading-[10px] font-pixel-label tracking-[0.04em] uppercase ${state === 'futura' ? 'text-muted' : state === 'atual' ? 'text-accent' : 'text-secondary'}`}>
                  {stageLabel(daily, stages, i).replace(/ ×\d+$/, '')}
                </span>
              </div>
              {!last && (
                <span
                  className={`mt-[15px] h-0.5 min-w-2 flex-1 ${state === 'feita' && states[i + 1] !== 'futura' ? 'bg-accent' : 'bg-stroke'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
        {end < stages.length && <MoreChip count={stages.length - end} label={`mais ${stages.length - end} etapas`} />}
      </ol>

      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex min-w-0 gap-1" aria-hidden="true">
          {states.map((state, i) => (
            <span key={i} className={`h-1.5 min-w-0 flex-1 ${state === 'feita' ? 'bg-accent' : state === 'atual' ? 'bg-accent-hover' : 'bg-stroke'}`} />
          ))}
        </div>
        {caption && <p className="text-rotulo-sm text-secondary">{caption}</p>}
      </div>
    </>
  );
}

/** Chip "+N" (Figma: Chip Neutro na ponta da barra). */
function MoreChip({ count, label, first = false }: { count: number; label: string; first?: boolean }) {
  return (
    <li className={`flex shrink-0 items-start ${first ? 'pr-2' : ''}`} aria-label={label} title={label}>
      <span className="flex h-6 items-center border-2 border-stroke px-1.5 text-rotulo-sm text-secondary">+{count}</span>
    </li>
  );
}
