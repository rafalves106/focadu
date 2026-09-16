import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseStatus, type CourseDetailDto } from '../api/types';
import { ProgressBar } from './ProgressBar';

/**
 * Carrossel de cursos matriculados (Fase 38c) - substitui o antigo label de texto puro
 * ("WEB SECURITY" acima do nome, so um <p> discreto) por 1 card visual por curso, arrastavel
 * horizontalmente. Sem lib de animacao nova (projeto nao usa nenhuma, ver package.json) - o drag
 * e so pointer events + transform/transition CSS, com resistencia ("rubber band") nas pontas.
 *
 * Hoje normalmente 1 card so - so existe 1 Course Active por matricula nesta fase (mesma premissa
 * de sempre, ver docs/ARQUITETURA.md) - mas o componente ja mapeia a lista inteira de cursos
 * matriculados (StartDashboard busca o detalhe de todos via Promise.all, nao so do ativo), pronto
 * pro dia em que isso deixar de ser verdade. Indicador de pagina (dots) só aparece com 2+ cursos.
 *
 * So o card ATIVO e "so leitura" aqui (as acoes reais - Hoje/Projeto/Trilha - ja estao nos cards
 * abaixo, mostrar as duas coisas seria redundante); os outros cursos (quando existirem) navegam
 * pra CourseDetailPage ao tocar, sem arrastar - ver handleClickCapture.
 */
export function CourseCarousel({ courses, activeCourseId }: { courses: CourseDetailDto[]; activeCourseId: string | null }) {
  const initialIndex = Math.max(
    0,
    courses.findIndex((c) => c.id === activeCourseId),
  );
  const [index, setIndex] = useState(initialIndex);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const draggedRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  if (courses.length === 0) return null;

  const clampedIndex = Math.min(index, courses.length - 1);
  const atStart = clampedIndex === 0;
  const atEnd = clampedIndex === courses.length - 1;

  function handlePointerDown(e: React.PointerEvent) {
    if (courses.length < 2) return;
    setDragging(true);
    draggedRef.current = false;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    let delta = e.clientX - startX.current;
    // Resistencia nas pontas - arrastar alem do 1o/ultimo card ainda se move, so que bem menos
    // (mesma sensacao de "esbarrar na borda" de qualquer carrossel nativo).
    if ((atStart && delta > 0) || (atEnd && delta < 0)) delta *= 0.35;
    if (Math.abs(delta) > 4) draggedRef.current = true;
    setDragX(delta);
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    const width = trackRef.current?.offsetWidth ?? 1;
    const threshold = width * 0.2;
    if (dragX < -threshold && !atEnd) setIndex(clampedIndex + 1);
    else if (dragX > threshold && !atStart) setIndex(clampedIndex - 1);
    setDragX(0);
  }

  // Sem isso, soltar o drag em cima de um card gera um click logo em seguida (comportamento
  // padrao do browser) - o que navegaria pra CourseDetailPage sem querer no meio de um swipe.
  function handleClickCapture(e: React.MouseEvent) {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={trackRef}
        className="overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={handleClickCapture}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(${-clampedIndex * 100}% + ${dragX}px))`,
            transition: dragging ? 'none' : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {courses.map((c) => (
            <div key={c.id} className="w-full shrink-0">
              <CourseCard course={c} isActive={c.id === activeCourseId} draggable={courses.length > 1} />
            </div>
          ))}
        </div>
      </div>

      {courses.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {courses.map((c, i) => (
            <button
              key={c.id}
              type="button"
              aria-label={`Ir para ${c.name}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === clampedIndex ? 'w-5 bg-accent' : 'w-1.5 bg-stroke'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, isActive, draggable }: { course: CourseDetailDto; isActive: boolean; draggable: boolean }) {
  const body = (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border-[1.5px] p-4 select-none ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isActive ? 'border-accent bg-accent/5' : 'border-stroke bg-surface hover:border-accent/50'
      }`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-semibold uppercase tracking-[2px] text-muted">{course.name}</p>
          {isActive && course.status === CourseStatus.Active && (
            <span className="shrink-0 rounded-full border border-accent bg-accent/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent">
              ATIVO
            </span>
          )}
        </div>
        <p className="text-sm text-secondary">{course.progress.completionPercentage}% do curso concluído</p>
      </div>
      <div className="w-24 shrink-0 sm:w-32">
        <ProgressBar progress={course.progress.completionPercentage / 100} heightClass="h-1.5" />
      </div>
    </div>
  );

  if (isActive) return body;
  return (
    <Link to={`/start?course=${course.id}`} className="block" draggable={false}>
      {body}
    </Link>
  );
}
