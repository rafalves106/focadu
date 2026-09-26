import { Link } from 'react-router-dom';
import {
  ActivityStatus,
  ActivityType,
  DailyAccessMode,
  DailyStatus,
  type CourseDetailDto,
  type DailyStateDto,
  type WeeklyDetailDto,
} from '../../api/types';
import { dailyStatusBadgeProps } from '../../lib/statusBadge';
import { StatusBadge } from '../StatusBadge';
import gemIcon from '../../assets/pixel/gema.png';
import fireIcon from '../../assets/pixel/chama-streak.png';
import playIcon from '../../assets/pixel/play-ativo.png';
import trophyIcon from '../../assets/pixel/trofeu.png';

/** Rotulo curto da etapa na cadeia (cabe embaixo de um quadrado de 40px). */
const STEP_LABEL: Record<ActivityType, string> = {
  [ActivityType.Quiz]: 'Quiz',
  [ActivityType.WordMatch]: 'Ligar',
  [ActivityType.Cloze]: 'Lacunas',
  [ActivityType.Roleplay]: 'Roleplay',
  [ActivityType.VoiceSummary]: 'Resumo',
  [ActivityType.Reading]: 'Leitura',
  [ActivityType.Video]: 'Vídeo',
};

/** Gemas por Daily concluida (UserGemBalance.DailyGemAmount no backend). */
const DAILY_GEMS = 1;

/**
 * "Missao do dia" (tela de start, 23/09/2026) - a unica acao principal da tela, pro curso escolhido:
 * material do dia, etapas da sessao em cadeia (feita / atual / por fazer), recompensa e um botao. Os
 * estados sem sessao pra rodar viram o mesmo cartao com outro texto: cota do dia gasta neste curso
 * (a cota e por curso), semana esperando o castelo, curso concluido.
 */
export function DailyMissionCard({
  course,
  daily,
  weekly,
  studiedToday,
  currentStreak,
}: {
  course: CourseDetailDto;
  daily: DailyStateDto | null;
  weekly: WeeklyDetailDto | null;
  studiedToday: boolean;
  currentStreak: number;
}) {
  if (!daily || !weekly) {
    return (
      <Shell label="// Missão cumprida">
        <div className="flex items-center gap-4">
          <img src={trophyIcon} alt="" className="size-12 shrink-0 pixelated" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h2 className="font-pixel text-3xl leading-none text-primary">Curso concluído</h2>
            <p className="font-pixel text-lg leading-snug text-secondary">Todos os dias e projetos de {course.name} estão feitos.</p>
          </div>
        </div>
        <CtaLink to={`/start?course=${course.id}`}>Ver a trilha</CtaLink>
      </Shell>
    );
  }

  const title = findDayTitle(course, daily.id);
  const closurePending = daily.accessMode === DailyAccessMode.WeekPendingClosure;
  const blocked = daily.accessMode === DailyAccessMode.Blocked;
  const badge = closurePending
    ? { icon: 'lock' as const, label: weekly.requiresPublicationToUnlock ? 'Publicação pendente' : 'Projeto pendente', tone: 'project' as const }
    : blocked
      ? { icon: 'lock' as const, label: 'Volta amanhã', tone: 'muted' as const }
      : dailyStatusBadgeProps(daily.status);

  return (
    <Shell label="// Missão do dia" badge={<StatusBadge {...badge} />}>
      <div className="flex flex-col gap-1">
        <p className="font-pixel-label text-[9px] text-secondary">
          {course.name} · Semana {weekly.number} · Dia {daily.dayNumber}
        </p>
        <h2 className="font-pixel text-3xl leading-none text-primary">{title ?? weekly.theme ?? weekly.title}</h2>
      </div>

      {closurePending ? (
        <>
          <p className="font-pixel text-lg leading-snug text-secondary">
            {weekly.requiresPublicationToUnlock
              ? 'Os dias e o projeto desta semana estão feitos. Falta validar a publicação do módulo para liberar a próxima semana.'
              : 'Os seis dias estão feitos. O castelo da semana está aberto: entregue o projeto para liberar a próxima.'}
          </p>
          <CtaLink
            to={
              weekly.requiresPublicationToUnlock
                ? `/start?course=${course.id}&weekly=${weekly.id}`
                : `/start?course=${course.id}&weekly=${weekly.id}&project=1`
            }
            tone="bg-project"
          >
            {weekly.requiresPublicationToUnlock ? 'Ver a semana' : 'Ir para o castelo'}
          </CtaLink>
        </>
      ) : (
        <>
          <StepChain daily={daily} blocked={blocked} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            {blocked ? (
              <p className="font-pixel text-lg leading-snug text-secondary">Sessão de hoje feita neste curso. O próximo dia abre amanhã.</p>
            ) : (
              <Reward studiedToday={studiedToday} currentStreak={currentStreak} replay={daily.status === DailyStatus.Completed} />
            )}
            {!blocked && (
              <CtaLink to={`/hoje?daily=${daily.id}`}>
                {daily.status === DailyStatus.Completed
                  ? 'Revisar missão'
                  : daily.status === DailyStatus.InProgress
                    ? 'Continuar missão ›'
                    : 'Começar missão ›'}
              </CtaLink>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

function Shell({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex shrink-0 flex-col gap-4 border-2 border-accent bg-base px-5 py-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-pixel-label text-[10px] text-accent">{label}</p>
        {badge}
      </div>
      {children}
    </section>
  );
}

function CtaLink({ to, tone = 'bg-accent', children }: { to: string; tone?: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={`self-start px-6 py-3 font-pixel-label text-[11px] text-base hover:brightness-110 ${tone}`}>
      {children}
    </Link>
  );
}

type StepState = 'feita' | 'atual' | 'pendente';

function StepChain({ daily, blocked }: { daily: DailyStateDto; blocked: boolean }) {
  const activities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const currentIndex = blocked ? -1 : activities.findIndex((a) => a.status !== ActivityStatus.Completed);
  const states: StepState[] = activities.map((a, i) =>
    a.status === ActivityStatus.Completed ? 'feita' : i === currentIndex ? 'atual' : 'pendente',
  );
  if (activities.length === 0) return null;

  return (
    <ol className="flex items-start" aria-label="Etapas da sessão">
      {activities.map((activity, i) => (
        <li key={activity.id} className={`flex items-start ${i < activities.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex w-14 shrink-0 flex-col items-center gap-1.5" aria-label={`${STEP_LABEL[activity.type]}: ${states[i]}`}>
            <span
              className={`flex size-10 items-center justify-center border-2 ${
                states[i] === 'feita' ? 'border-accent bg-accent' : states[i] === 'atual' ? 'border-accent' : 'border-stroke'
              }`}
            >
              {states[i] === 'feita' ? (
                <span className="font-pixel text-3xl leading-none text-base">✓</span>
              ) : states[i] === 'atual' ? (
                <img src={playIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
              ) : (
                <span className="font-pixel text-2xl leading-none text-muted">{i + 1}</span>
              )}
            </span>
            <span
              className={`text-center font-pixel-label text-[8px] ${
                states[i] === 'feita' ? 'text-accent' : states[i] === 'atual' ? 'text-primary' : 'text-muted'
              }`}
            >
              {STEP_LABEL[activity.type]}
            </span>
          </div>
          {i < activities.length - 1 && (
            <span className={`mt-[19px] h-0.5 flex-1 ${states[i + 1] !== 'pendente' ? 'bg-accent' : 'bg-stroke'}`} aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}

function Reward({ studiedToday, currentStreak, replay }: { studiedToday: boolean; currentStreak: number; replay: boolean }) {
  if (replay) return <p className="font-pixel text-lg leading-snug text-secondary">Revisão livre: sem gemas, sem pressa.</p>;
  return (
    <div className="flex items-center gap-4">
      <span className="font-pixel-label text-[8px] text-secondary">Recompensa</span>
      <span className="flex items-center gap-1.5 font-pixel text-xl leading-none text-primary">
        <img src={gemIcon} alt="" className="size-4 pixelated" aria-hidden="true" />+{DAILY_GEMS}
      </span>
      {!studiedToday && (
        <span className="flex items-center gap-1.5 font-pixel text-xl leading-none text-primary">
          <img src={fireIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
          {currentStreak + 1} {currentStreak + 1 === 1 ? 'dia' : 'dias'}
        </span>
      )}
    </div>
  );
}

function findDayTitle(course: CourseDetailDto, dailyId: string): string | null {
  for (const monthly of course.monthlies) {
    for (const week of monthly.weeklies) {
      const day = week.days.find((d) => d.id === dailyId);
      if (day) return day.title;
    }
  }
  return null;
}
