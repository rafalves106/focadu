import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { DailyStatus, WeeklyProjectStatus, type DailyOverviewDto, type WeeklyDetailDto, type WeeklyOverviewDto } from '../../api/types';
import { pendingReinforcementOf } from '../../lib/focadaMapLines';
import { toPlainTextPreview } from '../../lib/textPreview';
import { SegmentedBar } from '../SegmentedBar';
import { PixelChip } from '../session/PixelButton';
import pontoConcluido from '../../assets/pixel/mapa/ponto-concluido.png';
import pontoEmAndamento from '../../assets/pixel/mapa/ponto-em-andamento.png';
import pontoDisponivel from '../../assets/pixel/mapa/ponto-disponivel.png';
import pontoTrancado from '../../assets/pixel/mapa/ponto-trancado.png';
import casteloTrancado from '../../assets/pixel/mapa/castelo-trancado.png';
import casteloPendente from '../../assets/pixel/mapa/castelo-pendente.png';
import casteloConcluido from '../../assets/pixel/mapa/castelo-concluido.png';
import badgeReforco from '../../assets/pixel/mapa/badge-reforco.png';
import checkIcon from '../../assets/pixel/check.png';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';

type DayState = 'done' | 'now' | 'next' | 'lock';

const POINT: Record<DayState, string> = { done: pontoConcluido, now: pontoEmAndamento, next: pontoDisponivel, lock: pontoTrancado };

/** Botao desenhado (o clique e do link que cobre a linha inteira). */
const ACTION = 'relative shrink-0 items-center border-2 px-4 py-2.5 font-pixel-label text-[10px] leading-none';

function dayState(day: DailyOverviewDto, weekLocked: boolean): DayState {
  if (day.status === DailyStatus.Completed) return 'done';
  if (weekLocked) return 'lock';
  if (day.status === DailyStatus.InProgress) return 'now';
  return day.isNext ? 'next' : 'lock';
}

/**
 * Trilha da semana em pe (Figma "Visao da semana — v2", 137:5237): os dias da semana com os mesmos
 * pontos do mapa, ligados por uma linha vertical (verde ate onde o aluno foi), e o castelo do Projeto
 * Semanal fechando a lista. O 6º dia e a ponte (Fase 69). O reforco pendente vira selo no dia de origem
 * - atalho pra sessao de reforco, que precisa ficar sempre alcancavel (Fase 56).
 */
export function WeekTrail({
  weekly,
  overview,
  courseId,
  weekLocked,
  compact = false,
}: {
  weekly: WeeklyDetailDto;
  overview: WeeklyOverviewDto | null;
  courseId: string | null;
  weekLocked: boolean;
  /** Linhas mais baixas (Figma 138:6537): a faixa de publicacao ocupa o espaco de cima. */
  compact?: boolean;
}) {
  const days = weekly.dailies.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);
  const remaining = days.filter((d) => d.status !== DailyStatus.Completed).length;
  return (
    <ol className="flex flex-col" aria-label={`Dias da Semana ${weekly.number}`}>
      {days.map((day, i) => {
        const state = dayState(day, weekLocked);
        const summary = overview?.days.find((d) => d.id === day.id);
        const reinforcement = overview && summary ? pendingReinforcementOf(overview, summary) : null;
        return (
          <Fragment key={day.id}>
            <DayRow day={day} state={state} bridge={days.length === 6 && i === 5} reinforcementId={reinforcement?.id ?? null} compact={compact} />
            <li aria-hidden="true" className="pl-[26px] sm:pl-[30px]">
              <span className={`block w-1 ${compact ? 'h-1' : 'h-2 lg:short:h-1'} ${state === 'done' ? 'bg-accent' : 'bg-stroke'}`} />
            </li>
          </Fragment>
        );
      })}
      <CastleRow weekly={weekly} courseId={courseId} remaining={remaining} compact={compact} />
    </ol>
  );
}

function DayRow({ day, state, bridge, reinforcementId, compact }: { day: DailyOverviewDto; state: DayState; bridge: boolean; reinforcementId: string | null; compact: boolean }) {
  const locked = state === 'lock';
  const title = day.title ?? `Dia ${day.dayNumber}`;
  return (
    <li
      className={`relative flex items-center gap-3 border-2 px-3 sm:gap-4 sm:pl-4 sm:pr-[18px] ${compact ? 'py-1.5' : 'py-2.5 lg:short:py-1.5'} ${
        state === 'now' ? 'border-accent bg-accent/[0.08]' : 'border-stroke'
      } ${locked ? '' : 'hover:border-secondary'} ${state === 'now' ? 'hover:border-accent' : ''}`}
    >
      {!locked && <Link to={`/hoje?daily=${day.id}`} className="absolute inset-0" aria-label={`Dia ${day.dayNumber}: ${title}`} />}
      <img src={POINT[state]} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {day.title && <span className={`font-pixel-label text-[9px] ${locked ? 'text-muted' : 'text-secondary'}`}>Dia {String(day.dayNumber).padStart(2, '0')}</span>}
          {bridge && <PixelChip tone="project">Ponte</PixelChip>}
          {reinforcementId && (
            <Link to={`/hoje?daily=${reinforcementId}`} className="relative z-10 flex items-center gap-1.5 hover:brightness-125">
              <img src={badgeReforco} alt="" className="size-4 pixelated" aria-hidden="true" />
              <span className="font-pixel-label text-[8px] text-alert">Reforço pendente</span>
            </Link>
          )}
        </div>
        <p className={`font-pixel text-[21px] leading-none sm:text-2xl ${locked ? 'text-muted' : 'text-primary'}`}>{title}</p>
        {state === 'now' && day.totalActivities > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-24 sm:w-40">
              <SegmentedBar
                percentage={(100 * day.completedActivities) / day.totalActivities}
                segments={day.totalActivities}
                heightClass="h-2"
                label={`Etapa ${day.completedActivities} de ${day.totalActivities}`}
              />
            </div>
            <span className="whitespace-nowrap font-pixel-label text-[8px] text-accent">
              Etapa {day.completedActivities} de {day.totalActivities}
            </span>
          </div>
        )}
        {state === 'done' && (
          <span className="font-pixel-label text-[8px] text-accent sm:hidden">
            {day.passedActivities}/{day.totalActivities} aprovadas{day.penaltyPoints > 0 ? ` · ${errors(day.penaltyPoints)}` : ''}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        {state === 'done' && (
          <>
            <span className="hidden items-baseline gap-2 sm:flex">
              <span className="font-pixel text-[26px] leading-none text-accent">
                {day.passedActivities}/{day.totalActivities}
              </span>
              <span className="font-pixel-label text-[8px] text-secondary">aprovadas</span>
            </span>
            {day.penaltyPoints > 0 && (
              <span className="hidden sm:inline-flex">
                <PixelChip tone="alert">{errors(day.penaltyPoints)}</PixelChip>
              </span>
            )}
            <img src={checkIcon} alt="Concluído" className="size-8 pixelated" />
          </>
        )}
        {state === 'now' && (
          <span className={`${ACTION} flex border-accent bg-accent text-base`}>
            <span className="sm:hidden">Ir</span>
            <span className="hidden sm:inline">Continuar</span>
          </span>
        )}
        {state === 'next' && <span className={`${ACTION} flex border-accent bg-accent text-base`}>Entrar</span>}
        {locked && <img src={lockIcon} alt="Trancado" className="size-8 pixelated opacity-60" />}
      </div>
    </li>
  );
}

function CastleRow({ weekly, courseId, remaining, compact }: { weekly: WeeklyDetailDto; courseId: string | null; remaining: number; compact: boolean }) {
  const project = weekly.project;
  if (!project) {
    return (
      <li className="border-2 border-stroke px-4 py-3 font-pixel text-xl text-secondary">Nenhum projeto definido ainda para esta semana.</li>
    );
  }
  const castle =
    project.status === WeeklyProjectStatus.Evaluated
      ? { sprite: casteloConcluido, border: 'border-accent', text: `Avaliado · ${project.score ?? '-'}/100`, tone: 'text-accent', action: 'Ver projeto', solid: false }
      : project.status === WeeklyProjectStatus.Submitted
        ? { sprite: casteloPendente, border: 'border-project', text: 'Entregue: em avaliação', tone: 'text-project', action: 'Ver projeto', solid: false }
        : project.isLocked
          ? { sprite: casteloTrancado, border: 'border-stroke', text: `Abre em ${remaining} ${remaining === 1 ? 'dia' : 'dias'}`, tone: 'text-secondary', action: 'Ler o briefing', solid: false }
          : { sprite: casteloPendente, border: 'border-project', text: 'Aberto: hora de entregar', tone: 'text-project', action: 'Ver projeto', solid: true };
  const preview = project.specText ? toPlainTextPreview(project.specText) : '';
  return (
    <li className={`relative flex items-center gap-3 border-2 bg-project/[0.06] px-3 hover:brightness-110 sm:gap-4 sm:pl-4 sm:pr-[18px] ${compact ? 'py-2' : 'py-3 lg:short:py-2.5'} ${castle.border}`}>
      <Link to={`/start?course=${courseId ?? ''}&weekly=${weekly.id}&project=1`} className="absolute inset-0" aria-label={`Projeto da Semana ${weekly.number}: ${castle.text}`} />
      <img src={castle.sprite} alt="" className="size-16 shrink-0 pixelated lg:short:size-12" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <PixelChip tone="project">Boss</PixelChip>
          <span className="font-pixel-label text-[9px] text-project">Projeto semanal</span>
        </div>
        <p className="font-pixel text-[22px] leading-tight text-primary sm:text-[26px]">Projeto da Semana {weekly.number}</p>
        {preview && !compact && <p className="line-clamp-1 font-pixel text-lg leading-tight text-secondary lg:short:hidden">{preview}</p>}
        <p className={`font-pixel text-xl leading-none ${castle.tone}`}>{castle.text}</p>
      </div>
      <span className={`${ACTION} hidden border-project sm:flex ${castle.solid ? 'bg-project text-base' : 'text-project'}`}>{castle.action}</span>
    </li>
  );
}

function errors(n: number) {
  return `${n} ${n === 1 ? 'erro' : 'erros'}`;
}
