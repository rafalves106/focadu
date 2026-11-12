import { ActivityStatus, type DailyStateDto } from '../../api/types';
import { sessionStages, stageLabel } from '../../lib/sessionSteps';
import checkIcon from '../../assets/pixel/check.png';
import playIcon from '../../assets/pixel/play-ativo.png';

type StageState = 'feita' | 'atual' | 'pendente';

/** Quantos blocos cabem na cadeia do cartao sem estourar (dia com muitas etapas mostra uma janela). */
const MAX_VISIBLE = 7;

/** Janela de `MAX_VISIBLE` blocos em volta do atual; o que fica de fora vira "+N" nas pontas. */
function stageWindow(count: number, current: number): { start: number; end: number } {
  if (count <= MAX_VISIBLE) return { start: 0, end: count };
  const anchor = current < 0 ? count - 1 : current;
  const start = Math.min(Math.max(anchor - Math.floor(MAX_VISIBLE / 2), 0), count - MAX_VISIBLE);
  return { start, end: start + MAX_VISIBLE };
}

/**
 * Cadeia de etapas da sessao (Fase 68): blocos de atividades (ver lib/sessionSteps.ts) em quadrados
 * ligados, mesmo desenho da "missao do dia" do start. `activityId` nulo = sessao inteira concluida
 * (todos feitos). Abaixo de `lg` vira barra em blocos (1 por atividade), que cabe no celular.
 */
export function StageChain({ daily, activityId, allDone = false }: { daily: DailyStateDto; activityId: string | null; allDone?: boolean }) {
  const stages = sessionStages(daily);
  const states: StageState[] = stages.map((stage) => {
    if (allDone || stage.activities.every((a) => a.status === ActivityStatus.Completed && a.id !== activityId)) return 'feita';
    if (stage.activities.some((a) => a.id === activityId)) return 'atual';
    return 'pendente';
  });
  const all = stages.flatMap((s) => s.activities);
  const currentIndex = activityId ? all.findIndex((a) => a.id === activityId) : -1;
  const { start, end } = stageWindow(stages.length, states.indexOf('atual'));
  const visible = stages.slice(start, end);

  return (
    <>
      <ol className="hidden min-w-0 items-start overflow-hidden lg:flex" aria-label="Etapas da sessão">
        {start > 0 && <MoreChip count={start} title={`${start} etapas antes`} />}
        {visible.map((stage, k) => {
          const i = start + k;
          return (
          <li key={stage.activities[0].id} className={`flex min-w-0 items-start ${i < end - 1 ? 'flex-1' : ''}`}>
            <div className="flex shrink-0 flex-col items-center gap-1.5" aria-label={`${stageLabel(daily, stages, i)}: ${states[i]}`}>
              <span
                className={`flex size-8 items-center justify-center border-2 ${
                  states[i] === 'pendente' ? 'border-stroke' : 'border-accent'
                } ${states[i] === 'atual' ? 'bg-surface-alt' : 'bg-base'}`}
              >
                {states[i] === 'feita' ? (
                  <img src={checkIcon} alt="" className="size-4 pixelated" />
                ) : states[i] === 'atual' ? (
                  <img src={playIcon} alt="" className="size-4 pixelated" />
                ) : (
                  <span className="font-pixel text-xl leading-none text-muted">{i + 1}</span>
                )}
              </span>
              <span className={`whitespace-nowrap font-pixel-label text-[7px] ${states[i] === 'pendente' ? 'text-muted' : 'text-accent'}`}>
                {stageLabel(daily, stages, i)}
              </span>
            </div>
            {i < end - 1 && (
              <span className={`mt-[15px] h-0.5 min-w-3 flex-1 ${states[i + 1] !== 'pendente' ? 'bg-accent' : 'bg-stroke'}`} aria-hidden="true" />
            )}
          </li>
          );
        })}
        {end < stages.length && <MoreChip count={stages.length - end} title={`${stages.length - end} etapas depois`} />}
      </ol>
      <div className="flex min-w-0 gap-0.5 overflow-hidden lg:hidden" aria-hidden="true">
        {all.map((a, i) => (
          <span
            key={a.id}
            className={`h-1.5 flex-1 ${
              allDone || (a.status === ActivityStatus.Completed && i !== currentIndex) ? 'bg-accent' : i === currentIndex ? 'bg-project' : 'bg-surface-alt'
            }`}
          />
        ))}
      </div>
    </>
  );
}

/** "+N" na ponta da cadeia: blocos que ficaram fora da janela. */
function MoreChip({ count, title }: { count: number; title: string }) {
  return (
    <li className="flex shrink-0 items-start px-1.5" title={title} aria-label={title}>
      <span className="flex h-8 items-center border-2 border-stroke bg-base px-1.5 font-pixel-label text-[8px] text-secondary">+{count}</span>
    </li>
  );
}
