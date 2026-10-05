import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DailyStatus, WeeklyProjectStatus, type CourseDetailDto, type DailyStatusSummaryDto, type WeeklyOverviewDto } from '../../api/types';
import { isWeekDailiesDone, pendingReinforcementOf, primaryDays } from '../../lib/focadaMapLines';
import type { FocadaLine } from '../../lib/focadaLines';
import { FocadaSays } from '../session/FocadaSays';
import pontoConcluido from '../../assets/pixel/mapa/ponto-concluido.png';
import pontoEmAndamento from '../../assets/pixel/mapa/ponto-em-andamento.png';
import pontoDisponivel from '../../assets/pixel/mapa/ponto-disponivel.png';
import pontoTrancado from '../../assets/pixel/mapa/ponto-trancado.png';
import casteloTrancado from '../../assets/pixel/mapa/castelo-trancado.png';
import casteloPendente from '../../assets/pixel/mapa/castelo-pendente.png';
import casteloConcluido from '../../assets/pixel/mapa/castelo-concluido.png';
import badgeReforco from '../../assets/pixel/mapa/badge-reforco.png';
import focadaMarcador from '../../assets/pixel/mapa/focada-marcador.png';

type DayState = 'concluido' | 'em-andamento' | 'disponivel' | 'trancado';
type CastleState = 'trancado' | 'pendente' | 'entregue' | 'concluido';

const DAY_SPRITE: Record<DayState, string> = {
  concluido: pontoConcluido,
  'em-andamento': pontoEmAndamento,
  disponivel: pontoDisponivel,
  trancado: pontoTrancado,
};
const DAY_LABEL: Record<DayState, string> = {
  concluido: 'Concluído',
  'em-andamento': 'Em andamento',
  disponivel: 'Disponível',
  trancado: 'Trancado',
};
const CASTLE_SPRITE: Record<CastleState, string> = {
  trancado: casteloTrancado,
  pendente: casteloPendente,
  entregue: casteloPendente,
  concluido: casteloConcluido,
};
const CASTLE_LABEL: Record<CastleState, string> = {
  trancado: 'Abre quando os dias da semana acabarem',
  pendente: 'Liberado',
  entregue: 'Entregue, em avaliação',
  concluido: 'Concluído',
};

function dayState(day: DailyStatusSummaryDto): DayState {
  if (day.status === DailyStatus.Completed) return 'concluido';
  if (day.status === DailyStatus.InProgress) return 'em-andamento';
  return day.isNext ? 'disponivel' : 'trancado';
}

function castleState(week: WeeklyOverviewDto): CastleState {
  if (week.isPracticeOnly) return week.isClosed ? 'concluido' : 'trancado';
  if (week.projectStatus === WeeklyProjectStatus.Evaluated) return 'concluido';
  if (week.projectStatus === WeeklyProjectStatus.Submitted) return 'entregue';
  return isWeekDailiesDone(week) ? 'pendente' : 'trancado';
}

type Selection = { weekId: string; kind: 'dia'; dayId: string } | { weekId: string; kind: 'castelo' };

/**
 * Trilha do curso (molde v1, Figma "Fase 1 - C / Mapa simplificado"): gerada so dos dados do curso (modulos, semanas e
 * dias), sem arte nem coordenadas por curso - curso novo nao tem trabalho de mapa. Modulos viram abas (somem quando o
 * curso tem um so), cada semana e uma linha de nos, o dia de ponte (DailyStatusSummaryDto.isBridge) tem borda ambar e o no do projeto so aparece
 * em curso com Projeto Semanal. A Focada fica no proximo dia. Clicar num no abre o painel dele, com a mesma ação do
 * balao do mapa de arte (Entrar, Rever, Fazer reforco, Abrir projeto).
 */
export function CourseTrail({ course, courseId, focadaLine = null }: { course: CourseDetailDto; courseId: string; focadaLine?: FocadaLine | null }) {
  const monthlies = [...course.monthlies].sort((a, b) => a.number - b.number);
  const currentMonthly = monthlies.find((m) => m.weeklies.some((w) => w.days.some((d) => d.isNext))) ?? monthlies[0];
  const [monthlyId, setMonthlyId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  if (monthlies.length === 0) {
    return <p className="font-pixel text-2xl text-secondary">Este curso ainda não tem semanas cadastradas.</p>;
  }

  const monthly = monthlies.find((m) => m.id === monthlyId) ?? currentMonthly;
  const weeks = [...monthly.weeklies].sort((a, b) => a.number - b.number);
  const selectedWeek = selection ? weeks.find((w) => w.id === selection.weekId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      {focadaLine && (
        <FocadaSays expression={focadaLine.expression} size="sm">
          {focadaLine.text}
        </FocadaSays>
      )}

      {monthlies.length > 1 && (
        <div role="tablist" aria-label="Módulos do curso" className="flex flex-wrap gap-2">
          {monthlies.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === monthly.id}
              onClick={() => {
                setMonthlyId(m.id);
                setSelection(null);
              }}
              className={`min-h-10 border-2 px-3 font-pixel-label text-[10px] ${
                m.id === monthly.id ? 'border-accent bg-surface-alt text-accent' : 'border-stroke text-secondary hover:border-secondary'
              }`}
            >
              Módulo {m.number} · {m.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {weeks.map((week) => (
          <WeekRow
            key={week.id}
            week={week}
            selection={selection?.weekId === week.id ? selection : null}
            onSelect={setSelection}
          />
        ))}
      </div>

      {selection && selectedWeek && <NodePanel courseId={courseId} week={selectedWeek} selection={selection} onClose={() => setSelection(null)} />}
    </div>
  );
}

function WeekRow({ week, selection, onSelect }: { week: WeeklyOverviewDto; selection: Selection | null; onSelect: (s: Selection) => void }) {
  const days = primaryDays(week);
  const locked = week.isLocked;
  const showCastle = !week.isPracticeOnly;
  const cState = castleState(week);

  return (
    <div className={`flex flex-col gap-3 border-2 bg-base px-4 py-3 ${locked ? 'border-stroke opacity-60' : 'border-stroke'}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-pixel text-[22px] leading-tight text-primary">
          <span className="font-pixel-label text-[9px] text-secondary">Semana {String(week.number).padStart(2, '0')} </span>
          {week.theme ?? week.title}
        </p>
        <span className="font-pixel-label text-[9px] text-secondary">
          {locked ? 'Trancada' : `${week.completedDailies}/${week.totalDailies} dias`}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {days.map((day) => {
          const state = locked ? 'trancado' : dayState(day);
          const bridge = day.isBridge ?? false;
          const selected = selection?.kind === 'dia' && selection.dayId === day.id;
          return (
            <button
              key={day.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect({ weekId: week.id, kind: 'dia', dayId: day.id })}
              aria-label={`Dia ${day.dayNumber}${bridge ? ' (ponte)' : ''}: ${DAY_LABEL[state]}`}
              aria-pressed={selected}
              className={`relative flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 border-2 px-1.5 py-1 ${
                selected ? 'border-accent bg-surface-alt' : bridge ? 'border-project' : 'border-stroke hover:border-secondary'
              } disabled:cursor-default disabled:hover:border-stroke`}
            >
              {state === 'disponivel' && !locked && <img src={focadaMarcador} alt="Focada" className="absolute -top-4 size-5 pixelated" />}
              <img src={DAY_SPRITE[state]} alt="" className="size-5 pixelated" aria-hidden="true" />
              <span className={`font-pixel-label text-[8px] ${bridge ? 'text-project' : 'text-secondary'}`}>D{String(day.dayNumber).padStart(2, '0')}</span>
              {days.some((d) => pendingReinforcementOf(week, d) && d.id === day.id) && (
                <img src={badgeReforco} alt="Reforço pendente" className="absolute -right-1.5 -top-1.5 size-4 pixelated" />
              )}
            </button>
          );
        })}
        {showCastle && (
          <>
            <span className="font-pixel text-xl leading-none text-muted" aria-hidden="true">
              ›
            </span>
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect({ weekId: week.id, kind: 'castelo' })}
              aria-label={`Projeto da semana ${week.number}: ${CASTLE_LABEL[cState]}`}
              aria-pressed={selection?.kind === 'castelo'}
              className={`flex min-h-12 min-w-12 items-center justify-center border-2 ${
                selection?.kind === 'castelo' ? 'border-accent bg-surface-alt' : 'border-stroke hover:border-secondary'
              } disabled:cursor-default disabled:hover:border-stroke`}
            >
              <img src={locked ? casteloTrancado : CASTLE_SPRITE[cState]} alt="" className="size-7 pixelated" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function NodePanel({ courseId, week, selection, onClose }: { courseId: string; week: WeeklyOverviewDto; selection: Selection; onClose: () => void }) {
  const weekUrl = `/start?course=${courseId}&weekly=${week.id}`;
  let kicker: string;
  let heading: string;
  let status: { text: string; tone: string };
  let primary: { label: string; to: string } | null = null;

  if (selection.kind === 'dia') {
    const day = week.days.find((d) => d.id === selection.dayId);
    if (!day) return null;
    const state = dayState(day);
    kicker = `Dia ${day.dayNumber} · Semana ${week.number}`;
    heading = day.title ?? `Dia ${day.dayNumber}`;
    status = { text: DAY_LABEL[state], tone: state === 'trancado' ? 'text-muted' : 'text-accent' };
    const reinforcement = pendingReinforcementOf(week, day);
    if (reinforcement) primary = { label: 'Fazer reforço ›', to: `/hoje?daily=${reinforcement.id}` };
    else if (state !== 'trancado') primary = { label: state === 'concluido' ? 'Rever ›' : 'Entrar ›', to: `/hoje?daily=${day.id}` };
  } else {
    const state = castleState(week);
    kicker = `Projeto · Semana ${week.number}`;
    heading = week.theme ?? week.title;
    status = { text: CASTLE_LABEL[state], tone: state === 'concluido' ? 'text-accent' : state === 'trancado' ? 'text-muted' : 'text-project' };
    if (state !== 'trancado') primary = { label: 'Abrir projeto ›', to: `${weekUrl}&project=1` };
  }

  return (
    <div role="dialog" aria-label={kicker} className="pixel-box flex flex-col gap-2 bg-base p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-pixel-label text-[9px] text-secondary">{kicker}</p>
        <button type="button" onClick={onClose} aria-label="Fechar" className="min-h-10 min-w-10 font-pixel-label text-[10px] text-muted hover:text-primary">
          x
        </button>
      </div>
      <p className="font-pixel text-xl leading-tight text-primary">{heading}</p>
      <p className={`flex items-center gap-1.5 font-pixel-label text-[9px] ${status.tone}`}>
        <span className="size-1.5 bg-current" aria-hidden="true" />
        {status.text}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {primary && (
          <Link to={primary.to} className="bg-accent px-4 py-2.5 text-center font-pixel-label text-[10px] text-base hover:brightness-110">
            {primary.label}
          </Link>
        )}
        {primary?.to !== weekUrl && (
          <Link to={weekUrl} className="font-pixel-label text-[9px] text-secondary underline-offset-4 hover:text-primary hover:underline">
            Ver semana
          </Link>
        )}
      </div>
    </div>
  );
}
