import { StudyFormat, type CourseDetailDto, type SessionInfoDto } from '../api/types';

/**
 * Fase 111: contagem do curso em sessões, "2 de 3 sessões hoje" (cota, sala pendente, Início). Fase 112: a contagem do
 * dia aparece uma vez só, no rótulo da tela ou no Destaque do Início; o fio diz só "Sessão N".
 */
export function sessionCountLabel(session: SessionInfoDto): string {
  return `${session.completedToday} de ${session.perDay} sessões hoje`;
}

/** Fase 112: curso em sessões (molde D). Ausente em resposta antiga = Daily. */
export function isSessionsCourse(course: Pick<CourseDetailDto, 'studyFormat'> | null | undefined): boolean {
  return course?.studyFormat === StudyFormat.Sessions;
}

/**
 * Fase 112 (decisão do dono, 17/11/2026): no curso em sessões a unidade é a sessão, "Sessão 3" e "S3", porque num
 * mesmo dia cabem até N delas; no curso Daily segue "Dia 3" e "D3". O número é o mesmo `dayNumber`.
 */
export function unitName(sessions: boolean, n: number): string {
  return `${sessions ? 'Sessão' : 'Dia'} ${n}`;
}

export function unitShort(sessions: boolean, n: number): string {
  return `${sessions ? 'S' : 'D'}${n}`;
}
