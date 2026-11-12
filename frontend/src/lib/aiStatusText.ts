import type { AiHealth } from './useAiStatus';

/**
 * Status da IA no redesign v1 (Fase 109; sistema.md §8): o robozinho da nav virou um ponto no avatar
 * do agente e uma linha nas Configurações. Verde funcionando, âmbar parcial, vermelho fora do ar
 * (é erro de sistema na hora), cinza sem configuração ou sem resposta.
 */
export const AI_DOT: Record<AiHealth, string> = {
  ok: 'bg-accent',
  degraded: 'bg-project',
  down: 'bg-alert',
  unset: 'bg-muted',
  unknown: 'bg-muted',
};

/** Rótulo curto (menu do agente e nome acessível do ponto). */
export const AI_SHORT: Record<AiHealth, string> = {
  ok: 'IA funcionando',
  degraded: 'IA parcial',
  down: 'IA fora do ar',
  unset: 'IA não configurada',
  unknown: 'IA sem resposta',
};

/** Frase da linha "Status da IA" nas Configurações. */
export const AI_LINE: Record<AiHealth, string> = {
  ok: 'Funcionando. Avaliação por voz e chat no ar.',
  degraded: 'Parcial. Alguma avaliação pode demorar ou falhar agora.',
  down: 'Fora do ar. Avaliação por voz e chat voltam quando a IA voltar.',
  unset: 'Não configurada neste ambiente.',
  unknown: 'Sem resposta do servidor agora.',
};
