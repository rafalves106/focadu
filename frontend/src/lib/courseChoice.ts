import { CourseStatus } from '../api/types';

/**
 * Curso "da vez" com mais de uma matricula (01/10/2026, pedido do dono): Hoje, Trilha, Ranking, Squad e Perfil
 * oferecem um seletor de curso, e o padrao e o ultimo curso que o aluno abriu. O "ultimo" fica so neste
 * navegador (conveniencia, nao estado do servidor) - sem ele, vale o primeiro publicado, como antes.
 */
const KEY = 'focadu:ultimo-curso';

export function rememberCourse(courseId: string | null | undefined): void {
  if (!courseId) return;
  try {
    localStorage.setItem(KEY, courseId);
  } catch {
    // Armazenamento bloqueado (aba anonima, previa): so nao lembra.
  }
}

export function lastCourseId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** O curso a mostrar: o pedido (URL), senao o ultimo aberto, senao o primeiro publicado, senao o primeiro. */
export function pickCourse<T extends { id: string; status: CourseStatus }>(courses: readonly T[] | null | undefined, requestedId?: string | null): T | null {
  if (!courses || courses.length === 0) return null;
  const last = lastCourseId();
  return (
    courses.find((c) => c.id === requestedId) ??
    courses.find((c) => c.id === last) ??
    courses.find((c) => c.status === CourseStatus.Active) ??
    courses[0]
  );
}
