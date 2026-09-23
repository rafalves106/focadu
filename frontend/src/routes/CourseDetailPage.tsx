import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CourseStatus, WeeklyProjectStatus, type DailyStatusSummaryDto, type WeeklyOverviewDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { EmptyStateError } from '../components/errors/EmptyStateError';
import { dailyStatusBadgeProps } from '../lib/statusBadge';
import { CourseMap } from '../components/courseMap/CourseMap';
import { ScrollArea } from '../components/ScrollArea';
import { findCourseMap } from '../lib/courseMaps';
import { buildFocadaMapLine } from '../lib/focadaMapLines';
import { useIsMobile } from '../lib/useIsMobile';
import trophyIcon from '../assets/pixel/trofeu.png';
import medalIcon from '../assets/pixel/medalha-ouro.png';
import notebookIcon from '../assets/pixel/terminal.png';
import shieldIcon from '../assets/pixel/escudo.png';
import checkIcon from '../assets/pixel/check.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';

const DAY_MINI_TONE: Record<number, string> = {
  0: 'border-transparent bg-surface-alt text-muted', // Locked
  1: 'border-transparent bg-surface-alt text-muted', // Available
  2: 'border-accent bg-accent/10 text-accent', // InProgress
  3: 'border-accent/40 bg-accent/20 text-accent', // Completed
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
            <SegmentedBar percentage={course.progress.completionPercentage} />
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

/** Barra de progresso do HUD: 30 segmentos (1 segmento = 2 dias num curso de 60). */
function SegmentedBar({ percentage }: { percentage: number }) {
  const SEGMENTS = 30;
  const filled = Math.floor((percentage / 100) * SEGMENTS);
  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso do treinamento"
      className="flex gap-1"
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span key={i} className={`h-2.5 flex-1 ${i < filled ? 'bg-accent' : 'bg-stroke'}`} />
      ))}
    </div>
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

  const body = (
    <div
      className={`rounded-xl border-[1.5px] bg-surface p-5 ${isLocked ? 'opacity-50' : 'hover:border-accent'} ${isCurrent ? 'border-accent' : 'border-surface-alt'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {isComplete && !isLocked ? (
            <img src={checkIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
          ) : isLocked ? (
            <img src={lockIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
          ) : null}
          <p className="font-bold text-primary">
            Semana {weekly.number}: {weekly.theme ?? weekly.title}
          </p>
        </div>
        {isLocked ? (
          <span className="text-sm font-semibold text-project">Bloqueado</span>
        ) : (
          <span className="text-sm text-secondary">
            {weekly.completedDailies} de {weekly.totalDailies} dias
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {primaryDays.map((day) => (
          <DayMiniCard key={day.id} day={day} />
        ))}
        {weekly.hasWeeklyReinforcement && <span className="ml-2 text-xs text-alert">+ reforço</span>}
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

function DayMiniCard({ day }: { day: DailyStatusSummaryDto }) {
  const badge = dailyStatusBadgeProps(day.status);

  return (
    <div
      title={`Dia ${day.dayNumber} - ${badge.label}`}
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${DAY_MINI_TONE[day.status]}`}
    >
      {day.dayNumber}
    </div>
  );
}
