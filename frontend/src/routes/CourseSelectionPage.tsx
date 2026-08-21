import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { AvailableCourseDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';

/**
 * `/selecionar-curso` - passo 3/3 (Fase 13b, design Figma "Seleção de Curso Inicial", node
 * 19-370).
 *
 * Divergências deliberadas do Figma (mesmo mockup por natureza - so 1 Course real existe hoje, ver
 * SeedWebSecurityCourseUseCase):
 * - Grade de 4 cursos fixos do mockup virou uma grade dinâmica sobre GetAvailableCoursesUseCase -
 *   hoje renderiza so 1 card ("Web Security"), mas suporta N cursos reais no futuro sem mudar
 *   nada aqui.
 * - Badges "Recomendado"/"Iniciante"/"Intermediário"/"Avançado" e "5.1K alunos" não têm campo
 *   nenhum em AvailableCourseDto (Id/Title/Description/EstimatedDuration) - inventar esses
 *   números quebraria a mesma regra que StartDashboard já segue pra Gems/XP/streak. Omitidos.
 * - Nav de topo do mockup (mesma observação de OnboardingWelcomePage) - so o wordmark FOCADU.
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
    <div className="flex min-h-screen flex-col bg-base">
      <header className="border-b border-surface-alt px-8 py-5">
        <p className="text-lg font-black tracking-[0.3em] text-primary">FOCADU</p>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8">
        <OnboardingStepper step={3} />

        <div>
          <h1 className="text-3xl font-black text-primary">Escolha sua primeira missão</h1>
          <p className="mt-2 text-sm text-secondary">Escolha um curso pra começar sua jornada.</p>
        </div>

        {enrollError && <p className="text-sm text-alert">{enrollError}</p>}

        {courses.length === 0 ? (
          <p className="text-secondary">Você já está matriculado em todos os cursos disponíveis.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <div key={course.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-surface-alt bg-surface p-6">
                <div>
                  <h2 className="text-xl font-bold text-primary">{course.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">{course.description}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">{course.estimatedDuration}</span>
                  <button
                    type="button"
                    onClick={() => handleEnroll(course)}
                    disabled={enrollingId === course.id}
                    className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold tracking-wide text-base disabled:opacity-50"
                  >
                    {enrollingId === course.id ? 'MATRICULANDO...' : 'INICIAR MISSÃO'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
