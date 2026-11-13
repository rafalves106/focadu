import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { ClozeSentence } from './activities/ClozeSentence';
import { OptionsAnswer } from './OptionsAnswer';
import { SessionLayout } from './SessionShell';

/**
 * Quiz e Lacuna de multipla escolha (Fase 9; casca pixel art na Fase 68) - mesma mecanica de
 * OptionsAnswer, so o enunciado muda (a lacuna aparece realcada). `started` e so o gate da
 * apresentacao do bloco pela Focada (`BlockIntro`), na 1a atividade do bloco.
 */
export function QuizActivity({
  dailyId,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {

  return (
    <SessionLayout>
      {activity.type === ActivityType.Quiz ? (
        <p className="text-lead text-primary">{activity.prompt}</p>
      ) : (
        <ClozeSentence text={activity.prompt ?? ''} />
      )}
      <OptionsAnswer dailyId={dailyId} activity={activity} onDailyRefetched={onDailyRefetched} onContinue={onContinue} />
    </SessionLayout>
  );
}
