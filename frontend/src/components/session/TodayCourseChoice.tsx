import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { CourseSummaryDto } from '../../api/types';
import { pickCourse } from '../../lib/courseChoice';
import { ApiErrorScreen } from '../errors/ApiErrorScreen';
import { CourseSlots } from '../start/CourseSlots';
import { FocadaSays } from './FocadaSays';
import { PixelButton } from './PixelButton';
import { SessionLoading } from './SessionScreens';
import { useSessionKeys } from '../../lib/useSessionKeys';

/**
 * "/hoje" com 2+ matriculas (01/10/2026, pedido do dono): antes de abrir a sessao, o aluno escolhe o curso -
 * a cota de "1 Daily por dia" e por curso, entao "a Daily de hoje" depende dele. Ja vem marcado o ultimo curso
 * aberto; Enter entra. Os mesmos "save slots" da tela de start.
 */
export function TodayCourseChoice({ courses }: { courses: CourseSummaryDto[] }) {
  const navigate = useNavigate();
  const { data, error, retry } = useApiResource(() => Promise.all(courses.map((c) => api.getCourse(c.id))), [courses]);
  const [chosen, setChosen] = useState<string | null>(() => pickCourse(courses)?.id ?? null);

  const enter = () => {
    if (chosen) navigate(`/hoje?curso=${chosen}`);
  };
  useSessionKeys((key) => {
    if (key === 'Enter') enter();
  });

  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return <SessionLoading />;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10" data-testid="today-course-choice">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <p className="font-pixel-label text-[9px] text-accent">// Sessão de hoje</p>
        <FocadaSays expression="neutra" size="lg">
          Você está em {data.length} cursos, agente. Qual a gente estuda agora? Cada curso tem a sua Daily do dia.
        </FocadaSays>
        <CourseSlots courses={data} selectedId={chosen} onSelect={setChosen} />
        <PixelButton onClick={enter} disabled={!chosen} className="self-end">
          Abrir a sessão ›
        </PixelButton>
      </div>
    </div>
  );
}
