import { ActivityStatus, type DailyActivityDto, type DailyStateDto } from '../../api/types';
import { bridgeLayout, bridgePosition, subStepOf } from '../../lib/bridgeSteps';
import { PixelIcon } from '../ui/PixelIcon';

type State = 'feita' | 'atual' | 'futura';

const done = (activities: DailyActivityDto[]) => activities.length > 0 && activities.every((a) => a.status === ActivityStatus.Completed);

/**
 * Barra de etapas da ponte intercalada em dois níveis (Fase 113, docs/design/sistema.md §5 "Foco dividido"): em cima
 * `Etapa/Nó` para Abertura, Bloco 1, 2, 3 e Voz final (A, 1, 2, 3, V); embaixo, `Etapa/Segmento` com rótulo para as
 * etapas do bloco atual (bloco 1: Explicação, Prever, Fazer, Voz; bloco 2: + Corrigir; bloco 3: Explicação, Prever,
 * Ordenar, Fazer). Na Abertura e na Voz final o 2º nível é um segmento só. No celular: 5 segmentos (um por parte) e
 * a legenda "Bloco 1 · Prever · 2 de 4".
 */
export function BridgeStageBar({ daily, activityId, caption }: { daily: DailyStateDto; activityId: string | null; caption: string }) {
  const layout = bridgeLayout(daily);
  const position = bridgePosition(daily, activityId);
  const parts: { key: string; node: string; label: string; activities: DailyActivityDto[]; current: boolean }[] = [
    { key: 'a', node: 'A', label: 'Abertura', activities: layout.opening ? [layout.opening] : [], current: position.part === 'abertura' },
    ...layout.blocks.map((block, i) => ({ key: `b${i}`, node: String(i + 1), label: `Bloco ${i + 1}`, activities: block, current: position.block === i + 1 })),
    { key: 'v', node: 'V', label: 'Voz final', activities: layout.final ? [layout.final] : [], current: position.part === 'final' },
  ];
  const states: State[] = parts.map((p) => (p.current ? 'atual' : done(p.activities) ? 'feita' : 'futura'));

  const segments =
    position.part === 'bloco'
      ? position.steps.map((a, i) => ({
          id: a.id,
          label: subStepOf(a),
          state: (i === position.stepIndex ? 'atual' : a.status === ActivityStatus.Completed ? 'feita' : 'futura') as State,
        }))
      : [{ id: 'unico', label: position.part === 'abertura' ? 'O que vamos construir' : 'Fecha o dia', state: 'atual' as State }];

  return (
    <>
      <div className="hidden flex-col gap-3 md:flex">
        <ol className="flex min-w-0 items-start" aria-label="Partes do code comigo">
          {parts.map((part, i) => {
            const state = states[i];
            const last = i === parts.length - 1;
            return (
              <li key={part.key} className={`flex min-w-0 items-start ${last ? '' : 'flex-1'}`}>
                <div className="flex w-8 shrink-0 flex-col items-center gap-2" aria-label={`${part.label}: ${state}`}>
                  <span
                    className={`flex size-8 items-center justify-center border-2 text-rotulo-sm ${
                      state === 'feita' ? 'border-accent bg-accent text-base' : state === 'atual' ? 'border-accent bg-base text-accent' : 'border-stroke bg-surface text-muted'
                    }`}
                  >
                    {state === 'feita' ? <PixelIcon name="check" /> : part.node}
                  </span>
                  <span className={`whitespace-nowrap font-pixel-label text-[8px] leading-[10px] tracking-[0.04em] uppercase ${state === 'futura' ? 'text-muted' : state === 'atual' ? 'text-accent' : 'text-secondary'}`}>
                    {part.label}
                  </span>
                </div>
                {!last && <span className={`mt-[15px] h-0.5 min-w-2 flex-1 ${state === 'feita' ? 'bg-accent' : 'bg-stroke'}`} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
        <ol className="flex gap-1" aria-label="Etapas desta parte">
          {segments.map((s) => (
            <li key={s.id} className="flex min-w-0 flex-1 flex-col gap-2">
              <span className={`h-1.5 ${s.state === 'feita' ? 'bg-accent' : s.state === 'atual' ? 'bg-accent-hover' : 'bg-stroke'}`} aria-hidden="true" />
              <span className={`truncate text-rotulo-sm ${s.state === 'atual' ? 'text-accent' : s.state === 'feita' ? 'text-secondary' : 'text-muted'}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex min-w-0 gap-1" aria-hidden="true">
          {states.map((state, i) => (
            <span key={i} className={`h-1.5 min-w-0 flex-1 ${state === 'feita' ? 'bg-accent' : state === 'atual' ? 'bg-accent-hover' : 'bg-stroke'}`} />
          ))}
        </div>
        <p className="text-rotulo-sm text-secondary">{caption}</p>
      </div>
    </>
  );
}
