import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { WeeklyProjectStatus, type CourseDetailDto, type WeeklyDetailDto } from '../api/types';
import { useApiResource } from '../api/useApiResource';
import { ApiErrorScreen } from './errors/ApiErrorScreen';
import { FocadaSays } from './session/FocadaSays';
import { PixelButton } from './session/PixelButton';

interface CompletedData {
  course: CourseDetailDto;
  projectsDone: number;
  /** Nota do projeto mais recente avaliado; null se o curso nao tem projeto avaliado ou a nota nao veio. */
  lastScore: number | null;
}

async function loadCompleted(courseId: string | null): Promise<CompletedData> {
  const id = courseId ?? (await api.getCourses())[0]?.id;
  if (!id) throw new Error('Nenhum curso para mostrar.');
  const course = await api.getCourse(id);
  const evaluated = course.monthlies
    .flatMap((m) => m.weeklies)
    .filter((w) => w.projectStatus === WeeklyProjectStatus.Evaluated)
    .sort((a, b) => b.number - a.number);
  let lastScore: number | null = null;
  if (evaluated[0]) {
    const weekly: WeeklyDetailDto = await api.getWeekly(evaluated[0].id);
    lastScore = weekly.project?.score ?? null;
  }
  return { course, projectsDone: evaluated.length, lastScore };
}

function AchievementCard({ value, label, tone }: { value: number; label: string; tone: 'accent' | 'project' }) {
  const color = tone === 'project' ? 'border-project text-project' : 'border-accent text-accent';
  return (
    <div className={`flex min-w-36 flex-1 flex-col gap-1 border-2 px-4 py-3 ${color}`}>
      <span className="font-pixel text-5xl leading-none">{value}</span>
      <span className="font-pixel-label text-[9px] text-secondary uppercase">{label}</span>
    </div>
  );
}

/**
 * "Curso concluido" (aprovada no Figma, pagina "Curso concluido - v1", 26/10/2026): o aluno fez todos os
 * dias que existem no curso e nao ha projeto/publicacao por fechar. Entra no lugar do 404
 * `daily_hoje_nao_encontrada` do "/hoje". Nao e erro: sem vermelho, e nao diz que o curso acabou pra
 * sempre - novos dias entram conforme a curadoria publica.
 */
export function CourseCompletedScreen({ courseId }: { courseId: string | null }) {
  const navigate = useNavigate();
  const { data, error, retry } = useApiResource<CompletedData>(() => loadCompleted(courseId), [courseId]);

  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data) return null;

  const { course, projectsDone, lastScore } = data;
  const hasProject = projectsDone > 0;

  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-height))] flex-col items-center justify-center bg-base px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <p className="font-pixel-label text-[9px] text-accent uppercase">// {course.name} · Tudo concluído</p>
        <h1 className="font-pixel text-4xl leading-none text-primary uppercase">Tudo em dia</h1>
        <FocadaSays expression="comemorando" size="lg">
          {hasProject
            ? `Missão cumprida, agente. Você fez todos os dias que existem no ${course.name} até agora, e o projeto da semana já tem nota. Os próximos dias aparecem no seu início assim que a curadoria publicar.`
            : `Missão cumprida, agente. Você fez todos os dias que existem no ${course.name} até agora. Os próximos aparecem no seu início assim que a curadoria publicar.`}
        </FocadaSays>
        <div className="flex flex-wrap gap-3">
          <AchievementCard value={course.progress.completedDailies} label="Dias concluídos" tone="accent" />
          {hasProject && <AchievementCard value={projectsDone} label={projectsDone === 1 ? 'Projeto entregue' : 'Projetos entregues'} tone="project" />}
          {hasProject && lastScore !== null && <AchievementCard value={lastScore} label="Nota do último projeto" tone="project" />}
        </div>
        <div className="flex flex-col gap-1 border-2 border-secondary px-4 py-3">
          <p className="font-pixel-label text-[9px] text-accent">// O QUE VEM AGORA</p>
          <p className="font-pixel text-lg leading-tight text-secondary">
            Novos dias entram aos poucos, conforme a curadoria publica. Quando o próximo sair, ele aparece no seu início.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <PixelButton ghost tone="muted" onClick={() => navigate('/perfil')}>
            Ver meu perfil
          </PixelButton>
          <PixelButton onClick={() => navigate('/start')}>Voltar ao início ›</PixelButton>
        </div>
      </div>
    </div>
  );
}
