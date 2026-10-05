import { Link, useNavigate } from 'react-router-dom';
import { CourseSwitcher } from '../components/CourseSwitcher';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus, WeeklyProjectStatus } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { CourseTrail } from '../components/courseMap/CourseTrail';
import { ScrollArea } from '../components/ScrollArea';
import { SegmentedBar } from '../components/SegmentedBar';
import { buildFocadaMapLine } from '../lib/focadaMapLines';
import trophyIcon from '../assets/pixel/trofeu.png';
import medalIcon from '../assets/pixel/medalha-ouro.png';
import notebookIcon from '../assets/pixel/terminal.png';
import shieldIcon from '../assets/pixel/escudo.png';

/**
 * Detalhes do Curso (Fase 8, design Figma "Detalhes do Curso") - trilha completa via GET
 * /api/courses/{courseId} (CourseDetailDto ja existia desde a Fase 2; so o mini-grid por dia
 * (WeeklyOverviewDto.Days) e novo, ver GetCourseDetailUseCase). Nenhum endpoint novo.
 *
 * O mockup mostra "96 sub-aulas"/"4.800 XP"/pre-requisitos/curadoria - nenhum desses campos
 * existe no dominio (Course so tem Name/Status; XP/Gems seguem em standby, ver
 * docs/ARQUITETURA.md) - o resumo lateral mostra so numeros reais (dailies, reforcos).
 */
export function CourseDetailPage({ courseId }: { courseId: string }) {
  const { data: course, error, loading, retry } = useApiResource(() => api.getCourse(courseId), [courseId]);
  const { data: myCourses } = useApiResource(() => api.getCourses(), []);
  const navigate = useNavigate();
  if (loading) return <Centered text="Carregando curso..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!course) return null;

  const weeks = course.monthlies.flatMap((m) => m.weeklies);
  const reinforcementCount = course.dailyReinforcements.length + course.weeklyReinforcements.length;
  const projectsDone = weeks.filter((w) => w.projectStatus === WeeklyProjectStatus.Evaluated).length;
  // Fase 83: curso sem Projeto Semanal (pre-requisito) - o resumo conta pontes (semanas fechadas) e nao ha certificacoes.
  const practiceOnly = weeks.length > 0 && weeks.every((w) => w.isPracticeOnly);
  const bridgesDone = weeks.filter((w) => w.isClosed).length;
  // Molde v1: a trilha e gerada so dos dados do curso (CourseTrail), igual em desktop e celular - sem arte nem falas por curso.
  const mapLine = buildFocadaMapLine(course, new Map(course.monthlies.map((m) => [m.number, m.title])));

  // Fase 65: mesma receita do Projeto Semanal (Fase 61, WeeklyProjectPage) - mesmas margens
  // (lg:px-16, 45px no topo) e, a partir de `lg`, a altura da tela com rolagem so por dentro das colunas
  // (ScrollArea); abaixo disso volta pro fluxo normal. Tres colunas: cabecalho do curso (HUD) a esquerda
  // (250px), so o mapa no centro, resumo + atalhos a direita (250px). A fala da Focada saiu da coluna
  // esquerda (gerava rolagem no monitor, pedido do dono) e virou balao no marcador dela no mapa.
  return (
    <div className="flex flex-col gap-8 bg-base px-4 pt-6 pb-8 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12">
      <div className={`flex w-full shrink-0 flex-col lg:min-h-0 lg:w-[250px] lg:pt-11`}>
        <div data-guia="trilha-curso" className="pixel-box flex shrink-0 flex-col gap-4 bg-base p-5">
          <div className="flex flex-wrap items-center gap-3 font-pixel-label text-[10px]">
            {course.status === CourseStatus.Active && (
              <span className="border-2 border-accent px-2 py-1 text-accent">Curso ativo</span>
            )}
            <span className="text-secondary">
              {weeks.length} semana{weeks.length === 1 ? '' : 's'} ·{' '}
              {practiceOnly ? 'pré-requisito' : `${course.monthlies.length} ${course.monthlies.length === 1 ? 'mês' : 'meses'}`}
            </span>
          </div>
          <h1 className="font-pixel-label text-2xl leading-tight tracking-wide text-primary">{course.name}</h1>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 font-pixel-label text-[10px]">
              <span className="text-secondary">Progresso do treinamento</span>
              <span className="text-accent">{course.progress.completionPercentage}% completo</span>
            </div>
            <SegmentedBar percentage={course.progress.completionPercentage} label="Progresso do treinamento" />
          </div>
        </div>
        {myCourses && myCourses.length > 1 && (
          <div className="pixel-box mt-4 flex shrink-0 flex-col gap-3 bg-base p-4">
            <p className="font-pixel-label text-[10px] text-accent">// Trocar de trilha</p>
            <CourseSwitcher courses={myCourses} selectedId={courseId} onSelect={(id) => id && navigate(`/start?course=${id}`)} />
          </div>
        )}
      </div>

      {/* Coluna central: a trilha do curso (CourseTrail). */}
      <ScrollArea guia="trilha-mapa" className="min-h-0 min-w-0 flex-1" contentClassName="flex flex-col gap-6">
        <CourseTrail course={course} courseId={courseId} focadaLine={mapLine} />
      </ScrollArea>

      {/* Coluna lateral: Resumo do Curso como HUD (numeros + atalhos). */}
      <div className={`flex w-full shrink-0 flex-col lg:min-h-0 lg:w-[250px] lg:pt-11`}>
        <div data-guia="trilha-resumo" className="pixel-box flex shrink-0 flex-col gap-4 bg-base p-5">
          <p className="font-pixel-label text-[10px] text-accent">// Resumo do Curso</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat label="Dailies" value={`${course.progress.completedDailies}/${course.progress.totalDailies}`} />
            {practiceOnly ? (
              <Stat label="Pontes" value={`${bridgesDone}/${weeks.length}`} tone="text-project" />
            ) : (
              <Stat label="Projetos" value={`${projectsDone}/${weeks.length}`} tone="text-project" />
            )}
            <Stat label="Reforços" value={`${reinforcementCount}`} />
            <Stat label="Conclusão" value={`${course.progress.completionPercentage}%`} />
          </div>
          <Link to={`/hoje?curso=${courseId}`} className="bg-accent py-2.5 text-center font-pixel-label text-[10px] text-base hover:brightness-110">
            Continuar estudando
          </Link>
          {/* Atalhos: Ranking (Fase 16, ancorado aqui de proposito - "fica na visualizacao global do
              Course, pra nao distrair o aluno durante a Daily"), Conquistas (Fase 17) e, desde a Fase 65,
              Caderninho e Certificacoes - antes abas desta tela, agora botoes que abrem a tela deles. */}
          <div className="flex flex-col gap-2">
            <SideLink to={`/start?course=${courseId}&ranking=1`} icon={trophyIcon} label="Ver ranking" />
            <SideLink to="/conquistas" icon={medalIcon} label="Conquistas" />
            <SideLink to={`/start?course=${courseId}&caderninho=1`} icon={notebookIcon} label="Caderninho" />
            {!practiceOnly && <SideLink to={`/start?course=${courseId}&certifications=1`} icon={shieldIcon} label="Certificações" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SideLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-center gap-2 border-2 border-stroke py-2 font-pixel-label text-[10px] text-secondary hover:border-accent hover:text-primary"
    >
      <img src={icon} alt="" className="size-4 pixelated" aria-hidden="true" />
      {label}
    </Link>
  );
}

function Stat({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-pixel-label text-[8px] text-secondary">{label}</span>
      <span className={`font-pixel text-2xl leading-none ${tone}`}>{value}</span>
    </div>
  );
}
