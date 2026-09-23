import { Link } from 'react-router-dom';
import { DailyStatus, WeeklyProjectStatus, type DailyStatusSummaryDto, type WeeklyOverviewDto } from '../../api/types';
import { isWeekDailiesDone, pendingReinforcementOf, primaryDays } from '../../lib/focadaMapLines';
import pontoConcluido from '../../assets/pixel/mapa/ponto-concluido.png';
import pontoEmAndamento from '../../assets/pixel/mapa/ponto-em-andamento.png';
import pontoDisponivel from '../../assets/pixel/mapa/ponto-disponivel.png';
import pontoTrancado from '../../assets/pixel/mapa/ponto-trancado.png';
import casteloTrancado from '../../assets/pixel/mapa/castelo-trancado.png';
import casteloPendente from '../../assets/pixel/mapa/castelo-pendente.png';
import casteloConcluido from '../../assets/pixel/mapa/castelo-concluido.png';
import badgeReforco from '../../assets/pixel/mapa/badge-reforco.png';
import focadaMarcador from '../../assets/pixel/mapa/focada-marcador.png';

/**
 * "Rumo ao castelo" (tela de start, 23/09/2026): a semana atual do curso escolhido como um pedaco do
 * mapa da trilha - mesmos sprites e mesmos estados do CourseMap (ponto por dia, Focada no dia atual,
 * selo de reforco pendente) e o Projeto Semanal como castelo/BOSS. Substitui os cartoes soltos
 * "Projeto desta semana" e "Trilha completa".
 */
export function WeekPathCard({ week, courseId }: { week: WeeklyOverviewDto; courseId: string }) {
  const days = primaryDays(week);
  const remaining = days.filter((d) => d.status !== DailyStatus.Completed).length;
  const castle = castleOf(week, remaining);
  const focadaDayId = (days.find((d) => d.status === DailyStatus.InProgress) ?? days.find((d) => d.isNext))?.id ?? null;

  return (
    <section className="pixel-box flex shrink-0 flex-col gap-3 bg-base px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel-label text-[10px] text-accent">// Rumo ao castelo — Semana {week.number}</p>
        <Link to={`/start?course=${courseId}`} className="font-pixel-label text-[9px] text-secondary hover:text-primary">
          Ver trilha ›
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
        <ol className="flex min-w-[220px] flex-1 items-start" aria-label={`Dias da Semana ${week.number}`}>
          {days.map((day) => (
            <li key={day.id} className="flex flex-1 items-start">
              <DayPoint day={day} week={week} withFocada={day.id === focadaDayId} />
              {/* Linha no centro do ponto: marcador (32) + gap (4) + metade do ponto (16) - metade da linha (2). */}
              <span
                className={`mt-[50px] h-1 min-w-3 flex-1 ${day.status === DailyStatus.Completed ? 'bg-accent' : 'bg-stroke'}`}
                aria-hidden="true"
              />
            </li>
          ))}
        </ol>

        <Link
          to={`/start?course=${courseId}&weekly=${week.id}&project=1`}
          className={`flex items-center gap-3 border-2 px-3 py-2 ${castle.border} hover:brightness-110`}
          aria-label={`Projeto da Semana ${week.number}: ${castle.text}`}
        >
          <img src={castle.sprite} alt="" className="size-12 shrink-0 pixelated" aria-hidden="true" />
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <span className="border-2 border-project px-1 font-pixel-label text-[8px] text-project">Boss</span>
              <span className="font-pixel-label text-[9px] text-project">Projeto</span>
            </span>
            <span className="font-pixel text-lg leading-none text-secondary">{castle.text}</span>
          </span>
        </Link>
      </div>
    </section>
  );
}

function DayPoint({ day, week, withFocada }: { day: DailyStatusSummaryDto; week: WeeklyOverviewDto; withFocada: boolean }) {
  const sprite =
    day.status === DailyStatus.Completed
      ? pontoConcluido
      : day.status === DailyStatus.InProgress
        ? pontoEmAndamento
        : day.isNext
          ? pontoDisponivel
          : pontoTrancado;
  const current = withFocada;
  const reinforcement = pendingReinforcementOf(week, day);
  return (
    <div className="flex w-10 shrink-0 flex-col items-center gap-1" title={day.title ?? `Dia ${day.dayNumber}`}>
      <span className="flex size-8 items-end justify-center">
        {withFocada && <img src={focadaMarcador} alt="" className="size-8 pixelated motion-safe:animate-map-bob" aria-hidden="true" />}
      </span>
      <img src={sprite} alt="" className="size-8 pixelated" aria-hidden="true" />
      <span className="flex h-4 items-center">
        {reinforcement && (
          // Unico atalho pro reforco pendente na tela de start (Fase 56: precisa ficar sempre alcancavel).
          <Link to={`/hoje?daily=${reinforcement.id}`} title="Sessão de reforço pendente" className="hover:brightness-125">
            <img src={badgeReforco} alt={`Reforço pendente do dia ${day.dayNumber}`} className="size-4 pixelated" />
          </Link>
        )}
      </span>
      <span
        className={`font-pixel-label text-[8px] ${day.status === DailyStatus.Completed ? 'text-accent' : current ? 'text-primary' : 'text-muted'}`}
      >
        D{day.dayNumber}
      </span>
    </div>
  );
}

function castleOf(week: WeeklyOverviewDto, remaining: number): { sprite: string; text: string; border: string } {
  if (week.projectStatus === WeeklyProjectStatus.Evaluated) return { sprite: casteloConcluido, text: 'Concluído', border: 'border-accent' };
  if (week.projectStatus === WeeklyProjectStatus.Submitted) return { sprite: casteloPendente, text: 'Em avaliação', border: 'border-project' };
  if (isWeekDailiesDone(week)) return { sprite: casteloPendente, text: 'Aberto: entregue', border: 'border-project' };
  return {
    sprite: casteloTrancado,
    text: `Abre em ${remaining} ${remaining === 1 ? 'dia' : 'dias'}`,
    border: 'border-stroke',
  };
}
