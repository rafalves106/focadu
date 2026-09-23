import { ActivityStatus, type DailyStateDto } from '../../api/types';
import { STAGE_LABEL, sessionStages } from '../../lib/sessionSteps';
import checkIcon from '../../assets/pixel/check.png';
import playIcon from '../../assets/pixel/play-ativo.png';

type StageState = 'feita' | 'atual' | 'pendente';

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

  return (
    <>
      <ol className="hidden items-start lg:flex" aria-label="Etapas da sessão">
        {stages.map((stage, i) => (
          <li key={stage.activities[0].id} className={`flex items-start ${i < stages.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex shrink-0 flex-col items-center gap-1.5" aria-label={`${STAGE_LABEL[stage.type]}: ${states[i]}`}>
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
                {STAGE_LABEL[stage.type]}
                {stage.activities.length > 1 ? ` ×${stage.activities.length}` : ''}
              </span>
            </div>
            {i < stages.length - 1 && (
              <span className={`mt-[15px] h-0.5 min-w-3 flex-1 ${states[i + 1] !== 'pendente' ? 'bg-accent' : 'bg-stroke'}`} aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      <div className="flex gap-0.5 lg:hidden" aria-hidden="true">
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
