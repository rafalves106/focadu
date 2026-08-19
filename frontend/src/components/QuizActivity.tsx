import { useState } from 'react';
import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { ActivityScreen } from './Layout';
import { IntroCard } from './activities/IntroCard';
import { OptionsAnswer } from './OptionsAnswer';

/**
 * Quiz e Cloze/MultipleChoice (Fase 9, design Figma "Quiz 1-5") - mesma mecanica de OptionsAnswer,
 * so o rotulo muda; ganharam tela propria pra caber a Intro (design "Quiz 1") sem inchar
 * TodayPage.renderStep. `started` e so um gate visual local - a maquina de passo do TodayPage
 * nem sabe que essa etapa existe, a atividade so aparece "concluida" quando responde de verdade.
 */
export function QuizActivity({
  dailyId,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [started, setStarted] = useState(activity.responses.length > 0);
  const isQuiz = activity.type === ActivityType.Quiz;

  if (!started) {
    return (
      <IntroCard
        badge={isQuiz ? 'Quiz ativo' : 'Complete a frase'}
        title={isQuiz ? 'Quiz do dia' : 'Cloze — Complete a frase'}
        description={activity.prompt ?? ''}
        rules={['1 tentativa por pergunta - a opção correta é revelada logo depois de responder.']}
        ctaLabel={isQuiz ? 'INICIAR QUIZ' : 'COMEÇAR'}
        onStart={() => setStarted(true)}
      />
    );
  }

  return (
    <ActivityScreen eyebrow={isQuiz ? 'Quiz do dia' : 'Complete a frase'} title={activity.prompt ?? ''}>
      <OptionsAnswer dailyId={dailyId} activity={activity} onDailyRefetched={onDailyRefetched} onContinue={onContinue} />
    </ActivityScreen>
  );
}
