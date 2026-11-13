import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../../api/types';
import { blockIntro } from '../../lib/focadaSessionLines';
import { stepInfo } from '../../lib/sessionSteps';
import { FocadaLine } from '../ui/FocadaLine';

/**
 * Abertura de bloco embutida (redesign v1, Fase 109 etapa 4; sistema.md §6 e Figma `17:904`): a Fala
 * Abertura da Focada no topo da 1ª pergunta do bloco, com as regras numa frase. Substitui a tela
 * "Bora" (`BlockIntro`, Fase 68): o aluno já vê a pergunta junto. Some depois da 1ª resposta, quando a
 * Devolutiva toma o lugar (uma fala por tela).
 */
export function BlockOpening({ daily, activity }: { daily: DailyStateDto; activity: DailyActivityDto }) {
  const info = stepInfo(daily, activity.id);
  // Passo de codigo (Fase 79) nao agrupa na barra: a Focada apresenta todos os passos de uma vez.
  const count =
    activity.type === ActivityType.CodeStep
      ? daily.activities.filter((a) => a.type === ActivityType.CodeStep).length
      : activity.type === ActivityType.TerminalMission
        ? (activity.missions?.length ?? 1)
        : (info?.stage.activities.length ?? 1);
  const intro = blockIntro(activity.type, activity.answerMode, count, daily.penaltyThreshold, activity.codeStep?.maxAttempts);
  return (
    <FocadaLine label={`Focada · ${intro.title}`}>{intro.text}</FocadaLine>
  );
}
