import type { SessionInfoDto } from '../api/types';

/**
 * Fase 111: contagem do curso em sessões. "feitas" (cota/sala pendente): "2 de 3 sessões hoje"; "atual" (aquecimento da
 * sessão que começa): "sessão 2 de 3 hoje" (a atual ainda não está concluída, então é a próxima da contagem).
 */
export function sessionCountLabel(session: SessionInfoDto, mode: 'feitas' | 'atual'): string {
  if (mode === 'feitas') return `${session.completedToday} de ${session.perDay} sessões hoje`;
  return `Sessão ${Math.min(session.completedToday + 1, session.perDay)} de ${session.perDay} hoje`;
}
