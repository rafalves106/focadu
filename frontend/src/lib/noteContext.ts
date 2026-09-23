import type { NoteDto } from '../api/types';

/** "Semana X, Dia Y" ou, pra nota do Projeto Semanal (Fase 63), "Semana X, Projeto". */
export function noteContextLabel(note: Pick<NoteDto, 'weekNumber' | 'dayNumber'>): string {
  return note.dayNumber === null ? `Semana ${note.weekNumber}, Projeto` : `Semana ${note.weekNumber}, Dia ${note.dayNumber}`;
}
