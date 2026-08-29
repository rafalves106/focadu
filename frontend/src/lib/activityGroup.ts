import type { DailyActivityDto, DailyStateDto } from '../api/types';

/**
 * Verdadeiro se `activity` é a primeira de uma sequência de atividades consecutivas do mesmo
 * tipo (Quiz, Cloze, WordMatch, Roleplay...) dentro da Daily. Usado pelos componentes com
 * IntroCard pra só mostrar a intro antes da primeira pergunta/desafio do bloco - não de novo a
 * cada pergunta. `key={activity.id}` (TodayPage.renderStep) remonta o componente a cada
 * atividade, então o gate não pode depender só de `activity.responses` (sempre vazio numa
 * pergunta ainda não respondida, mesmo que não seja a primeira do bloco).
 */
export function isFirstOfActivityGroup(daily: DailyStateDto, activity: DailyActivityDto): boolean {
  const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const index = sorted.findIndex((a) => a.id === activity.id);
  const previous = sorted[index - 1];
  return !previous || previous.type !== activity.type || previous.answerMode !== activity.answerMode;
}
