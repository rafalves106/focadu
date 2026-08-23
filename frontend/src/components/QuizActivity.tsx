import { useState } from 'react';
import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { IntroCard } from './activities/IntroCard';
import { OptionsAnswer } from './OptionsAnswer';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

/**
 * Quiz e Cloze/MultipleChoice (Fase 9, design Figma "Quiz 1-5" - fidelidade revisada na Fase 19,
 * node "Sessão Diária — Quiz") - mesma mecanica de OptionsAnswer, so o rotulo muda; ganharam tela
 * propria pra caber a Intro (design "Quiz 1") sem inchar TodayPage.renderStep. `started` e so um
 * gate visual local - a maquina de passo do TodayPage nem sabe que essa etapa existe, a atividade
 * so aparece "concluida" quando responde de verdade.
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
  const [started, setStarted] = useState(activity.responses.length > 0);
  const isQuiz = activity.type === ActivityType.Quiz;
  const { weekly, sidebar } = useMaterialSidebar(daily);

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

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const total = sortedActivities.length;

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — ${isQuiz ? 'QUIZ' : 'CLOZE TEST'}`}
      progress={(stepIndex + 1) / total}
      sidebar={sidebar}
    >
      <p className="text-2xl font-semibold leading-[1.3] text-primary">{activity.prompt}</p>
      <OptionsAnswer dailyId={dailyId} activity={activity} onDailyRefetched={onDailyRefetched} onContinue={onContinue} />
    </SessionLayout>
  );
}
