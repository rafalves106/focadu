import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus, WeeklyProjectStatus, type WeeklyOverviewDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { EmptyStateError } from '../components/errors/EmptyStateError';
import { CourseMap } from '../components/courseMap/CourseMap';
import { ScrollArea } from '../components/ScrollArea';
import { SegmentedBar } from '../components/SegmentedBar';
import { findCourseMap } from '../lib/courseMaps';
import { buildFocadaMapLine } from '../lib/focadaMapLines';
import { useIsMobile } from '../lib/useIsMobile';
import trophyIcon from '../assets/pixel/trofeu.png';
import medalIcon from '../assets/pixel/medalha-ouro.png';
import notebookIcon from '../assets/pixel/terminal.png';
import shieldIcon from '../assets/pixel/escudo.png';
import checkIcon from '../assets/pixel/check.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';
import pontoConcluido from '../assets/pixel/mapa/ponto-concluido.png';
import pontoEmAndamento from '../assets/pixel/mapa/ponto-em-andamento.png';
import pontoDisponivel from '../assets/pixel/mapa/ponto-disponivel.png';
import pontoTrancado from '../assets/pixel/mapa/ponto-trancado.png';
import casteloTrancado from '../assets/pixel/mapa/castelo-trancado.png';
import casteloPendente from '../assets/pixel/mapa/castelo-pendente.png';
import casteloConcluido from '../assets/pixel/mapa/castelo-concluido.png';
import badgeReforco from '../assets/pixel/mapa/badge-reforco.png';

const DAY_POINT: Record<number, string> = {
  0: pontoTrancado, // Locked
  1: pontoDisponivel, // Available
  2: pontoEmAndamento, // InProgress
  3: pontoConcluido, // Completed
};

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
  const isMobile = useIsMobile();
  const courseMap = useMemo(() => (course ? findCourseMap(course.name) : null), [course]);
  if (loading) return <Centered text="Carregando curso..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!course) return null;

  const weeks = course.monthlies.flatMap((m) => m.weeklies);
  const reinforcementCount = course.dailyReinforcements.length + course.weeklyReinforcements.length;
  const currentWeekId = findCurrentWeekId(weeks);
  const projectsDone = weeks.filter((w) => w.projectStatus === WeeklyProjectStatus.Evaluated).length;
  // Fase 65: mapa da trilha no desktop quando o curso tem arte desenhada; celular (e curso sem mapa)
  // segue com a lista de semanas - versao vertical do mapa pro celular ficou pra depois (rascunho).
  const showMap = courseMap !== null && !isMobile;
  const mapLine = showMap ? buildFocadaMapLine(course, new Map([...courseMap.values()].map((r) => [r.monthlyNumber, r.titulo]))) : null;

  const weekList = (list: WeeklyOverviewDto[]) => (
    <div className="flex flex-col gap-3">
      {list.map((weekly) => (
        <WeekSummaryCard
          key={weekly.id}
          weekly={weekly}
          courseId={courseId}
          isLocked={weekly.isLocked}
          isCurrent={weekly.id === currentWeekId}
        />
      ))}
      {list.length === 0 && (
        <EmptyStateError title="Nenhuma semana cadastrada" description="Este curso ainda não tem semanas cadastradas." />
      )}
    </div>
  );

  // Fase 65: mesma receita do Projeto Semanal (Fase 61, WeeklyProjectPage) - mesmas margens
  // (lg:px-16, 45px no topo) e, a partir de `lg`, a altura da tela com rolagem so por dentro das colunas
  // (ScrollArea); abaixo disso volta pro fluxo normal. Tres colunas: cabecalho do curso (HUD) a esquerda
  // (250px), so o mapa no centro, resumo + atalhos a direita (250px). A fala da Focada saiu da coluna
  // esquerda (gerava rolagem no monitor, pedido do dono) e virou balao no marcador dela no mapa.
  return (
    <div className="flex flex-col gap-8 bg-base px-4 pt-6 pb-8 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12">
      <div className={`flex w-full shrink-0 flex-col lg:min-h-0 lg:w-[250px] ${showMap ? 'lg:pt-11' : ''}`}>
        <div className="pixel-box flex shrink-0 flex-col gap-4 bg-base p-5">
          <div className="flex flex-wrap items-center gap-3 font-pixel-label text-[10px]">
            {course.status === CourseStatus.Active && (
              <span className="border-2 border-accent px-2 py-1 text-accent">Curso ativo</span>
            )}
            <span className="text-secondary">
              {weeks.length} semana{weeks.length === 1 ? '' : 's'} · {course.monthlies.length} {course.monthlies.length === 1 ? 'mês' : 'meses'}
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
      </div>

      {/* Coluna central: so o mapa da trilha - ou a lista de semanas no celular e em curso sem mapa. */}
      <ScrollArea className="min-h-0 min-w-0 flex-1" contentClassName="flex flex-col gap-6">
        {showMap ? (
          <CourseMap
            course={course}
            courseId={courseId}
            regions={courseMap}
            renderFallback={(monthly) => weekList(monthly.weeklies)}
            focadaLine={mapLine}
          />
        ) : (
          weekList(weeks)
        )}
      </ScrollArea>

      {/* Coluna lateral: Resumo do Curso como HUD (numeros + atalhos). */}
      <div className={`flex w-full shrink-0 flex-col lg:min-h-0 lg:w-[250px] ${showMap ? 'lg:pt-11' : ''}`}>
        <div className="pixel-box flex shrink-0 flex-col gap-4 bg-base p-5">
          <p className="font-pixel-label text-[10px] text-accent">// Resumo do Curso</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat label="Dailies" value={`${course.progress.completedDailies}/${course.progress.totalDailies}`} />
            <Stat label="Projetos" value={`${projectsDone}/${weeks.length}`} tone="text-project" />
            <Stat label="Reforços" value={`${reinforcementCount}`} />
            <Stat label="Conclusão" value={`${course.progress.completionPercentage}%`} />
          </div>
          <Link to="/hoje" className="bg-accent py-2.5 text-center font-pixel-label text-[10px] text-base hover:brightness-110">
            Continuar estudando
          </Link>
          {/* Atalhos: Ranking (Fase 16, ancorado aqui de proposito - "fica na visualizacao global do
              Course, pra nao distrair o aluno durante a Daily"), Conquistas (Fase 17) e, desde a Fase 65,
              Caderninho e Certificacoes - antes abas desta tela, agora botoes que abrem a tela deles. */}
          <div className="flex flex-col gap-2">
            <SideLink to={`/start?course=${courseId}&ranking=1`} icon={trophyIcon} label="Ver ranking" />
            <SideLink to="/conquistas" icon={medalIcon} label="Conquistas" />
            <SideLink to={`/start?course=${courseId}&caderninho=1`} icon={notebookIcon} label="Caderninho" />
            <SideLink to={`/start?course=${courseId}&certifications=1`} icon={shieldIcon} label="Certificações" />
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

/** A 1a semana acessivel (nao bloqueada por uma semana anterior ainda nao fechada - projeto/publicacao pendente, ver `isLocked`) que ainda nao esta completa - so ela ganha o destaque visual de "semana atual" em WeekSummaryCard. */
function findCurrentWeekId(weeks: WeeklyOverviewDto[]): string | null {
  for (const week of weeks) {
    const isComplete = week.totalDailies > 0 && week.completedDailies === week.totalDailies;
    if (!week.isLocked && !isComplete) return week.id;
  }
  return null;
}

function Stat({ label, value, tone = 'text-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-pixel-label text-[8px] text-secondary">{label}</span>
      <span className={`font-pixel text-2xl leading-none ${tone}`}>{value}</span>
    </div>
  );
}

/**
 * Semana na trilha em lista (celular e curso sem mapa; pixel art na Fase 74, Figma 146:7461): tema da
 * semana, os pontos dos dias (mesmos sprites do mapa), o castelo do projeto e o status. A semana atual
 * ganha a borda verde; trancada fica apagada e sem link.
 */
function WeekSummaryCard({
  weekly,
  courseId,
  isLocked,
  isCurrent,
}: {
  weekly: WeeklyOverviewDto;
  courseId: string;
  isLocked: boolean;
  isCurrent: boolean;
}) {
  const isComplete = weekly.totalDailies > 0 && weekly.completedDailies === weekly.totalDailies;
  const primaryDays = weekly.days.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);
  const castle =
    weekly.projectStatus === WeeklyProjectStatus.Evaluated ? casteloConcluido : isComplete ? casteloPendente : casteloTrancado;
  const status = isLocked
    ? 'Trancada'
    : weekly.projectStatus === WeeklyProjectStatus.Evaluated
      ? `${weekly.completedDailies}/${weekly.totalDailies} · castelo caído`
      : `${weekly.completedDailies}/${weekly.totalDailies} dias`;

  const body = (
    <div
      className={`flex flex-col gap-2.5 border-2 bg-base px-3.5 py-3 ${isLocked ? 'border-stroke opacity-55' : isCurrent ? 'border-accent' : 'border-stroke hover:border-secondary'}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-pixel-label text-[8px] text-secondary">Semana {String(weekly.number).padStart(2, '0')}</span>
          <span className="font-pixel text-[22px] leading-tight text-primary">{weekly.theme ?? weekly.title}</span>
        </div>
        <img
          src={isLocked ? lockIcon : isComplete ? checkIcon : pontoEmAndamento}
          alt={isLocked ? 'Trancada' : isComplete ? 'Concluída' : 'Em andamento'}
          className="size-8 shrink-0 pixelated"
        />
      </div>
      <div className="flex items-center gap-1.5">
        {primaryDays.map((day) => (
          <img key={day.id} src={DAY_POINT[day.status] ?? pontoTrancado} alt="" title={`Dia ${day.dayNumber}`} className="size-4 pixelated" />
        ))}
        <span className="font-pixel text-xl leading-none text-muted" aria-hidden="true">
          ›
        </span>
        <img src={castle} alt="" className="size-4 pixelated" aria-hidden="true" />
        {weekly.hasWeeklyReinforcement && <img src={badgeReforco} alt="Reforço" className="size-4 pixelated" />}
        <span className={`ml-auto font-pixel-label text-[8px] ${isCurrent && !isLocked ? 'text-accent' : 'text-secondary'}`}>{status}</span>
      </div>
    </div>
  );

  if (isLocked) return body;
  return (
    <Link to={`/start?course=${courseId}&weekly=${weekly.id}`} className="block">
      {body}
    </Link>
  );
}
