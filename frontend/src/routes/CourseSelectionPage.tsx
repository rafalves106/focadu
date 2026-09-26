import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { AvailableCourseDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { PixelFormError } from '../components/auth/PixelFields';
import { EntryScreen } from '../components/entry/Entry';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelButton } from '../components/session/PixelButton';
import casteloIcon from '../assets/pixel/mapa/castelo-pendente.png';

/**
 * `/selecionar-curso` - passo 3/3 (Fase 13b; pixel art na Fase 74, Figma "Entrada e onboarding — v2",
 * node 145:7045): os cursos disponiveis como "save slots" com o castelo (mesma linguagem do start). Ao
 * matricular, vai pro /start.
 */
export function CourseSelectionPage() {
  const navigate = useNavigate();
  const { data: courses, error, loading, retry } = useApiResource(() => api.getAvailableCourses(), []);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  if (loading) return <Centered text="Carregando cursos..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!courses) return null;

  async function handleEnroll(course: AvailableCourseDto) {
    setEnrollingId(course.id);
    setEnrollError(null);
    try {
      await api.createEnrollment(course.id);
      navigate('/start');
    } catch (err) {
      setEnrollError(err instanceof ApiError ? err.message : 'Não foi possível concluir a matrícula.');
      setEnrollingId(null);
    }
  }

  return (
    <EntryScreen step={3}>
      <div className="mx-auto flex w-full max-w-[1248px] flex-1 flex-col gap-7 px-4 py-10 lg:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-pixel-label text-[10px] text-accent">// Escolha sua primeira missão</p>
            <h1 className="font-pixel text-[40px] leading-none text-primary sm:text-[48px]">Onde você começa?</h1>
          </div>
          <FocadaSays size="sm" className="sm:max-w-[340px]">
            Um curso de cada vez, agente. Dá pra entrar em outro depois.
          </FocadaSays>
        </div>

        <PixelFormError>{enrollError}</PixelFormError>

        {courses.length === 0 ? (
          <p className="font-pixel text-2xl text-secondary">Você já está matriculado em todos os cursos disponíveis.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {courses.map((course, i) => (
              <div
                key={course.id}
                className={`flex flex-col gap-3.5 border-2 bg-base px-6 py-[22px] ${i === 0 ? 'border-accent shadow-[6px_6px_0_0_#1c9e3e]' : 'border-stroke'}`}
              >
                <div className="flex items-center gap-4">
                  <img src={casteloIcon} alt="" className="size-24 shrink-0 pixelated" aria-hidden="true" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-pixel-label text-[9px] text-secondary">Curso {String(i + 1).padStart(2, '0')}</span>
                    <h2 className="font-pixel text-[36px] leading-none text-primary">{course.title}</h2>
                  </div>
                </div>
                <p className="font-pixel text-[22px] leading-tight text-secondary">{course.description}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                  <span className="font-pixel-label text-[9px] text-muted">{course.estimatedDuration}</span>
                  <PixelButton ghost={i !== 0} onClick={() => handleEnroll(course)} disabled={enrollingId !== null}>
                    {enrollingId === course.id ? 'Matriculando...' : 'Iniciar missão'}
                  </PixelButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EntryScreen>
  );
}
