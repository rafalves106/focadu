import { Link } from 'react-router-dom';
import type { CourseDetailDto } from '../../api/types';
import { courseWhereabouts, isCourseFinished } from '../../lib/startScreen';
import { SegmentedBar } from '../SegmentedBar';
import crownIcon from '../../assets/pixel/coroa.png';

/**
 * "Save slots" dos cursos matriculados (tela de start, 23/09/2026) - substitui o carrossel: todos os
 * cursos visiveis de uma vez, com % e onde o agente parou. Escolher um slot troca o centro e a coluna
 * direita da tela (o pai guarda a escolha em `?curso=`).
 */
export function CourseSlots({
  courses,
  selectedId,
  onSelect,
}: {
  courses: CourseDetailDto[];
  selectedId: string | null;
  onSelect: (courseId: string) => void;
}) {
  return (
    <div className="pixel-box flex shrink-0 flex-col gap-3 bg-base p-4">
      <p className="font-pixel-label text-[10px] text-accent">// Seus cursos</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Curso exibido na tela">
        {courses.map((course) => (
          <Slot key={course.id} course={course} selected={course.id === selectedId} onSelect={() => onSelect(course.id)} />
        ))}
      </div>
      <Link
        to="/selecionar-curso"
        className="border-2 border-dashed border-stroke py-1.5 text-center font-pixel-label text-[10px] text-muted hover:border-secondary hover:text-secondary"
      >
        + Explorar cursos
      </Link>
    </div>
  );
}

function Slot({ course, selected, onSelect }: { course: CourseDetailDto; selected: boolean; onSelect: () => void }) {
  const finished = isCourseFinished(course);
  const where = finished ? null : courseWhereabouts(course);
  const pct = course.progress.completionPercentage;
  const sub = finished
    ? 'Concluído'
    : where
      ? `Semana ${where.week.number}${where.dayNumber !== null ? ` · Dia ${where.dayNumber}` : ' · Castelo'}`
      : '';

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex items-center gap-2 border-2 px-3 py-2 text-left ${
        selected ? 'border-accent' : 'border-stroke opacity-80 hover:border-secondary hover:opacity-100'
      }`}
    >
      <span className={`w-2 font-pixel-label text-xs text-accent ${selected ? '' : 'invisible'}`} aria-hidden="true">
        &gt;
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate font-pixel-label text-[10px] ${selected ? 'text-primary' : 'text-secondary'}`}>{course.name}</span>
          {finished && <img src={crownIcon} alt="" className="size-4 shrink-0 pixelated" aria-hidden="true" />}
        </span>
        <span className="flex items-center gap-2">
          <span className="flex-1">
            <SegmentedBar
              percentage={pct}
              segments={10}
              heightClass="h-1.5"
              tone={finished ? 'bg-project' : 'bg-accent'}
              label={`Progresso de ${course.name}`}
            />
          </span>
          <span className={`font-pixel text-lg leading-none ${finished ? 'text-project' : selected ? 'text-accent' : 'text-secondary'}`}>
            {pct}%
          </span>
        </span>
        <span className={`font-pixel-label text-[8px] ${finished ? 'text-project' : 'text-muted'}`}>{sub}</span>
      </span>
    </button>
  );
}
