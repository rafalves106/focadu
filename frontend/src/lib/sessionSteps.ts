import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';

/**
 * Etapas da sessao diaria agrupadas em blocos (Fase 68, Figma "Daily — redesign proposto"): as ~18
 * atividades de um dia viram ~8 blocos na cadeia do cabecalho (Leitura, Resumo, Video, Resumo, Quiz
 * x6, Lacunas x4, Ligar x3, Roleplay). Bloco = atividades CONSECUTIVAS do mesmo tipo e modo de
 * resposta - a mesma regra de `isFirstOfActivityGroup` (lib/activityGroup.ts), que decide onde a
 * Focada apresenta um bloco novo.
 */
export interface SessionStage {
  type: ActivityType;
  activities: DailyActivityDto[];
}

/** Rotulo curto do bloco na cadeia (cabe embaixo de um quadrado de 32px). */
export const STAGE_LABEL: Record<ActivityType, string> = {
  [ActivityType.Quiz]: 'Quiz',
  [ActivityType.WordMatch]: 'Ligar',
  [ActivityType.Cloze]: 'Lacunas',
  [ActivityType.Roleplay]: 'Roleplay',
  [ActivityType.VoiceSummary]: 'Resumo',
  [ActivityType.Reading]: 'Leitura',
  [ActivityType.Video]: 'Vídeo',
};

/** Nome da etapa no cabecalho do cartao ("ETAPA 5 DE 18 — QUIZ"). */
export const ACTIVITY_TITLE: Record<ActivityType, string> = {
  [ActivityType.Quiz]: 'Quiz',
  [ActivityType.WordMatch]: 'Ligar palavras',
  [ActivityType.Cloze]: 'Complete a lacuna',
  [ActivityType.Roleplay]: 'Roleplay',
  [ActivityType.VoiceSummary]: 'Resumo falado',
  [ActivityType.Reading]: 'Leitura',
  [ActivityType.Video]: 'Vídeo',
};

/** Unidade do contador fino dentro de um bloco com mais de 1 atividade ("QUESTÃO 2 DE 6"). */
const UNIT: Partial<Record<ActivityType, string>> = {
  [ActivityType.Quiz]: 'Questão',
  [ActivityType.Cloze]: 'Lacuna',
  [ActivityType.WordMatch]: 'Grupo',
};

export function sortedActivities(daily: DailyStateDto): DailyActivityDto[] {
  return [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
}

export function sessionStages(daily: DailyStateDto): SessionStage[] {
  const stages: SessionStage[] = [];
  for (const activity of sortedActivities(daily)) {
    const last = stages.at(-1);
    const prev = last?.activities.at(-1);
    if (last && prev && prev.type === activity.type && prev.answerMode === activity.answerMode) last.activities.push(activity);
    else stages.push({ type: activity.type, activities: [activity] });
  }
  return stages;
}

export interface StepInfo {
  /** Posicao da atividade na Daily inteira (0-based) e total de atividades. */
  index: number;
  total: number;
  stageIndex: number;
  stage: SessionStage;
  /** Posicao dentro do bloco (0-based). */
  positionInStage: number;
  /** "ETAPA 5 DE 18 — QUIZ". */
  label: string;
  /** "QUESTÃO 1 DE 6" - vazio em bloco de 1 atividade so. */
  sub: string;
}

export function stepInfo(daily: DailyStateDto, activityId: string): StepInfo | null {
  const all = sortedActivities(daily);
  const index = all.findIndex((a) => a.id === activityId);
  if (index < 0) return null;
  const stages = sessionStages(daily);
  const stageIndex = stages.findIndex((s) => s.activities.some((a) => a.id === activityId));
  const stage = stages[stageIndex];
  const positionInStage = stage.activities.findIndex((a) => a.id === activityId);
  const unit = UNIT[stage.type];
  return {
    index,
    total: all.length,
    stageIndex,
    stage,
    positionInStage,
    label: `Etapa ${index + 1} de ${all.length} — ${ACTIVITY_TITLE[stage.type]}`,
    sub: unit && stage.activities.length > 1 ? `${unit} ${positionInStage + 1} de ${stage.activities.length}` : '',
  };
}
