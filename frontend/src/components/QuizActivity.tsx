import { useState } from 'react';
import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { ClozeSentence } from './activities/ClozeSentence';
import { OptionsAnswer } from './OptionsAnswer';
import { SessionLayout } from './SessionShell';
import { BlockIntro } from './session/BlockIntro';

/**
 * Quiz e Lacuna de multipla escolha (Fase 9; casca pixel art na Fase 68) - mesma mecanica de
 * OptionsAnswer, so o enunciado muda (a lacuna aparece realcada). `started` e so o gate da
 * apresentacao do bloco pela Focada (`BlockIntro`), na 1a atividade do bloco.
 */
export function QuizActivity({
  dailyId,
  daily,
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
  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || activity.responses.length > 0);

  if (!started) return <BlockIntro activity={activity} onStart={() => setStarted(true)} />;

  return (
    <SessionLayout>
      {activity.type === ActivityType.Quiz ? (
        <p className="font-pixel text-[28px] leading-[1.1] text-primary lg:text-[32px]">{activity.prompt}</p>
      ) : (
        <ClozeSentence text={activity.prompt ?? ''} />
      )}
      <OptionsAnswer dailyId={dailyId} activity={activity} onDailyRefetched={onDailyRefetched} onContinue={onContinue} />
    </SessionLayout>
  );
}
