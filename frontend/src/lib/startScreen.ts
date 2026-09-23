import { DailyStatus, WeeklyProjectStatus, type CourseDetailDto, type WeeklyOverviewDto } from '../api/types';
import { primaryDays } from './focadaMapLines';

/**
 * Derivacoes da tela de start com varios cursos (23/09/2026, redesign do Figma "Start — redesign
 * proposto", node 55:4502) - tudo a partir do CourseDetailDto que a tela ja carrega, sem endpoint novo.
 */

/** Curso terminado = projeto da ultima semana avaliado (mesma regra da fala "cursoConcluido" do mapa). */
export function isCourseFinished(course: CourseDetailDto): boolean {
  const weeks = course.monthlies.flatMap((m) => m.weeklies).sort((a, b) => a.number - b.number);
  return weeks.length > 0 && weeks[weeks.length - 1].projectStatus === WeeklyProjectStatus.Evaluated;
}

/** Onde o agente parou no curso: semana + dia da proxima Daily (ou a em andamento). */
export function courseWhereabouts(course: CourseDetailDto): { week: WeeklyOverviewDto; dayNumber: number | null } | null {
  const weeks = course.monthlies.flatMap((m) => m.weeklies).sort((a, b) => a.number - b.number);
  for (const week of weeks) {
    const day = primaryDays(week).find((d) => d.status === DailyStatus.InProgress || d.isNext);
    if (day) return { week, dayNumber: day.dayNumber };
  }
  // Sem proxima Daily: semana com os dias feitos esperando o projeto (ou a publicacao) fechar.
  const open = weeks.find((w) => w.projectStatus !== WeeklyProjectStatus.Evaluated);
  return open ? { week: open, dayNumber: null } : null;
}

/** Alguma Daily original concluida hoje, em qualquer curso - o streak do agente e global. */
export function studiedToday(courses: CourseDetailDto[]): boolean {
  return courses.some((c) => c.monthlies.some((m) => m.weeklies.some((w) => primaryDays(w).some((d) => d.completedToday))));
}

