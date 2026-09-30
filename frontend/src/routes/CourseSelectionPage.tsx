import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { RecommendedCourseStatus, type AvailableCourseDto, type RecommendedCourseDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { PixelFormError } from '../components/auth/PixelFields';
import { EntryScreen } from '../components/entry/Entry';
import { PixelModal } from '../components/PixelModal';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelButton, PixelChip, PixelLink } from '../components/session/PixelButton';
import casteloIcon from '../assets/pixel/mapa/castelo-pendente.png';

/**
 * `/selecionar-curso` - passo 3/3 (Fase 13b; pixel art na Fase 74, Figma "Entrada e onboarding — v2",
 * node 145:7045): os cursos disponiveis como "save slots" com o castelo (mesma linguagem do start). Fase 84
 * (Figma "Escolha de curso: recomendacao — v2"): os cursos sao livres (decisao do dono, 30/09/2026) - cada
 * cartao ganha um selo de recomendacao e "Ver curso" abre a ficha (o que ajuda saber antes e o curso que a
 * Focadu recomenda antes). A matricula sai da ficha, sem trava nem "tem certeza?". Ao matricular, vai pro /start.
 */
export function CourseSelectionPage() {
  const navigate = useNavigate();
  const { data: courses, error, loading, retry } = useApiResource(() => api.getAvailableCourses(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  if (loading) return <Centered text="Carregando cursos..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!courses) return null;

  const selected = courses.find((c) => c.id === selectedId) ?? null;

  async function handleEnroll(course: AvailableCourseDto) {
    setEnrollingId(course.id);
    setEnrollError(null);
    try {
      await api.createEnrollment(course.id);
      navigate('/start');
    } catch (err) {
      setEnrollError(err instanceof ApiError ? err.message : 'Não foi possível concluir a matrícula.');
      setEnrollingId(null);
      setSelectedId(null);
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
            Os cursos são livres, agente. Eu só digo por onde eu começaria.
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
                <CourseBadge course={course} />
                <p className="font-pixel text-[22px] leading-tight text-secondary">{course.description}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                  <span className="font-pixel-label text-[9px] text-muted">{course.estimatedDuration}</span>
                  <PixelButton ghost={i !== 0} onClick={() => setSelectedId(course.id)} disabled={enrollingId !== null}>
                    Ver curso
                  </PixelButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <CourseSheet
          course={selected}
          available={courses}
          enrolling={enrollingId !== null}
          onOpen={setSelectedId}
          onEnroll={() => handleEnroll(selected)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </EntryScreen>
  );
}

/** Selo do cartao: recomendacao (ambar) ou o que o curso prepara (verde). Sem nenhum dos dois, nada. */
function CourseBadge({ course }: { course: AvailableCourseDto }) {
  const rec = course.recommendedBefore[0];
  if (rec) {
    if (rec.status === RecommendedCourseStatus.Completed) return <Badge tone="accent">{rec.name} feito</Badge>;
    if (rec.status === RecommendedCourseStatus.InProgress) return <Badge tone="accent">{rec.name} em andamento</Badge>;
    return <Badge tone="project">Recomendado antes: {rec.name}</Badge>;
  }
  if (course.preparesFor.length > 0) return <Badge tone="accent">Prepara pro {course.preparesFor.join(' e ')} · começa do zero</Badge>;
  return null;
}

function Badge({ tone, children }: { tone: 'accent' | 'project'; children: ReactNode }) {
  return (
    <span className="w-fit">
      <PixelChip tone={tone}>{children}</PixelChip>
    </span>
  );
}

/**
 * Ficha do curso (Figma quadros 02/03/04): descricao, o que ajuda saber antes, a recomendacao e o que o curso
 * prepara. "Comecar pelo X" abre a ficha do recomendado (ou leva pra ele, se o aluno ja esta la).
 */
function CourseSheet({
  course,
  available,
  enrolling,
  onOpen,
  onEnroll,
  onClose,
}: {
  course: AvailableCourseDto;
  available: AvailableCourseDto[];
  enrolling: boolean;
  onOpen: (courseId: string) => void;
  onEnroll: () => void;
  onClose: () => void;
}) {
  const recs = course.recommendedBefore;
  const pending = recs.find((r) => r.status !== RecommendedCourseStatus.Completed) ?? null;
  return (
    <PixelModal label={`Ficha do curso ${course.title}`} title="Ficha do curso" onClose={onClose} widthClass="max-w-3xl">
      <div className="flex items-center gap-4">
        <img src={casteloIcon} alt="" className="size-16 shrink-0 pixelated" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="font-pixel text-[36px] leading-none text-primary sm:text-[44px]">{course.title}</h2>
          <span className="font-pixel-label text-[9px] text-secondary">{course.estimatedDuration}</span>
        </div>
      </div>

      <p className="font-pixel text-[22px] leading-tight text-secondary">{course.description}</p>

      {course.requirements.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="font-pixel-label text-[10px] text-accent">// {recs.length > 0 ? 'O que ajuda saber antes' : 'O que você precisa antes'}</p>
          <ul className="flex flex-col gap-1.5">
            {course.requirements.map((r) => (
              <li key={r} className="font-pixel text-[22px] leading-tight text-primary">
                · {r}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recs.map((r) => (
        <RecommendationBox key={r.id} rec={r} />
      ))}

      {course.preparesFor.length > 0 && course.preparesText && (
        <div className="flex flex-col gap-1.5 border-2 border-accent bg-accent/[0.08] px-4 py-3.5">
          <p className="font-pixel-label text-[9px] text-accent">Prepara pro {course.preparesFor.join(' e ')}</p>
          <p className="font-pixel text-[22px] leading-tight text-primary">{course.preparesText}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {pending && <RecommendedAction rec={pending} available={available} onOpen={onOpen} />}
        <PixelButton onClick={onEnroll} disabled={enrolling}>
          {enrolling ? 'Matriculando...' : `Iniciar ${course.title}`}
        </PixelButton>
      </div>
    </PixelModal>
  );
}

function RecommendationBox({ rec }: { rec: RecommendedCourseDto }) {
  if (rec.status === RecommendedCourseStatus.Completed) {
    return (
      <div className="flex flex-col gap-1.5 border-2 border-accent bg-accent/[0.08] px-4 py-3.5">
        <p className="font-pixel-label text-[9px] text-accent">{rec.name} feito</p>
        <p className="font-pixel text-[22px] leading-tight text-primary">Você já fez o {rec.name}: está pronto pra este.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5 border-2 border-project bg-project/[0.08] px-4 py-3.5">
      <p className="font-pixel-label text-[9px] text-project">
        A Focadu recomenda antes: {rec.name} · {rec.estimatedDuration}
      </p>
      <p className="font-pixel text-[22px] leading-tight text-primary">
        {rec.status === RecommendedCourseStatus.InProgress
          ? `Você já está no ${rec.name}. Pode terminar ele antes ou começar este agora: nenhum curso tranca o outro.`
          : `O ${rec.name} cobre tudo isso. Já sabe? Pode começar direto: nenhum curso tranca o outro.`}
      </p>
    </div>
  );
}

function RecommendedAction({ rec, available, onOpen }: { rec: RecommendedCourseDto; available: AvailableCourseDto[]; onOpen: (courseId: string) => void }) {
  if (rec.status === RecommendedCourseStatus.InProgress) {
    return (
      <PixelLink to={`/start?course=${rec.id}`} ghost>
        Ir pro {rec.name}
      </PixelLink>
    );
  }
  if (!available.some((c) => c.id === rec.id)) return null;
  return (
    <PixelButton ghost onClick={() => onOpen(rec.id)}>
      Começar pelo {rec.name}
    </PixelButton>
  );
}
