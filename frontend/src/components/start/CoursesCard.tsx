import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CourseDetailDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { currentStop } from '../../lib/focadaMapLines';
import { courseDayCount, courseDoneDayCount, courseSizeText } from '../../lib/weekPath';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';

/**
 * "Seus cursos" do Início (Fase 109; Figma `15:464`, cartão Suave): o curso escolhido e onde o aluno está
 * nele. Com mais de um curso, "Trocar curso" (Secundário) abre um Modal com a lista; escolher troca o
 * Início inteiro (guardado em `?curso=`). No 1º dia vira "Seu curso", com o tamanho do curso.
 */
export function CoursesCard({
  courses,
  selected,
  firstDay,
  onSelect,
}: {
  courses: CourseDetailDto[];
  selected: CourseDetailDto;
  firstDay: boolean;
  onSelect: (courseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const many = courses.length > 1;
  // Fase 96: aluno de turma só vê os cursos da turma - nada de catálogo.
  const inCohort = Boolean(useAuth().user?.cohortName);

  return (
    <Card kind="suave" eyebrow={many ? 'Seus cursos' : 'Seu curso'} className="shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-corpo text-primary">{selected.name}</p>
          <p className="text-rotulo-sm text-secondary">{firstDay ? courseSizeText(selected) : whereabouts(selected)}</p>
        </div>
        {many && (
          <Button kind="secundario" onClick={() => setOpen(true)}>
            Trocar curso
          </Button>
        )}
      </div>

      {open && (
        <Modal label="Trocar curso" eyebrow="Seus cursos" title="Qual curso agora?" onClose={() => setOpen(false)}>
          <ul className="flex flex-col gap-2">
            {courses.map((course) => {
              const on = course.id === selected.id;
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    aria-current={on || undefined}
                    onClick={() => {
                      onSelect(course.id);
                      setOpen(false);
                    }}
                    className={`flex min-h-11 w-full items-center justify-between gap-4 border-2 px-4 py-3 text-left ${
                      on ? 'border-accent bg-accent-tint' : 'border-stroke-strong hover:border-secondary'
                    }`}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-corpo text-primary">{course.name}</span>
                      <span className="text-rotulo-sm text-secondary">{whereabouts(course)}</span>
                    </span>
                    {on && <span className="shrink-0 text-rotulo-sm text-accent">Aberto</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {!inCohort && (
            <Link to="/selecionar-curso" className="text-rotulo-sm text-accent hover:text-accent-hover">
              Ver outros cursos ›
            </Link>
          )}
        </Modal>
      )}
    </Card>
  );
}

/** "Semana 1 · 2 de 72 dias". */
function whereabouts(course: CourseDetailDto): string {
  const week = currentStop(course)?.week.number;
  return [week ? `Semana ${week}` : null, `${courseDoneDayCount(course)} de ${courseDayCount(course)} dias`].filter(Boolean).join(' · ');
}
