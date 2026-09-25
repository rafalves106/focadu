import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { PROJECT_LANGUAGE_NAMES, type BadgeDto, type GamificationSummaryDto, type StudyDayStatus, type UserDto } from '../../api/types';
import { knownBadges } from '../../lib/badgeInfo';
import { lookFromDto } from '../../lib/agentSprites';
import { MEDALS } from '../../lib/profileLook';
import { AgentSprite } from '../agent/AgentSprite';
import { SegmentedBar } from '../SegmentedBar';
import { PanelLabel } from '../squad/pixelStage';
import fireIcon from '../../assets/pixel/chama-streak.png';
import trophyIcon from '../../assets/pixel/trofeu.png';
import gemIcon from '../../assets/pixel/gema.png';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';
import checkIcon from '../../assets/pixel/check.png';
import crownIcon from '../../assets/pixel/coroa.png';
import terminalIcon from '../../assets/pixel/terminal.png';

const CARD = 'flex min-w-0 flex-col border-2 bg-base';

/** 4 "cartuchos" do topo (Fase 72): ofensiva, score e posicao no curso ativo, gems. */
export function ProfileStats({ gamification, score, position, rankingHref }: { gamification: GamificationSummaryDto; score: number | null; position: number | null; rankingHref: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:gap-4 lg:short:gap-3">
      <Stat icon={fireIcon} value={String(gamification.currentStreak)} unit={gamification.currentStreak === 1 ? 'dia' : 'dias'} label={`Ofensiva · recorde ${gamification.longestStreak}`} tone="text-project" border="border-project/60" />
      <Stat icon={trophyIcon} value={score !== null ? score.toFixed(1) : '—'} label="Score no curso" />
      <Stat
        icon={position !== null && position <= 3 ? MEDALS[position - 1] : trophyIcon}
        value={position !== null ? `${position}º` : '—'}
        label="No curso · ranking ›"
        to={rankingHref}
      />
      <Stat icon={gemIcon} value={String(gamification.totalGems)} label="Gems · abrir loja ›" tone="text-accent" to="/loja" />
    </div>
  );
}

function Stat({ icon, value, unit, label, tone = 'text-primary', border = 'border-stroke', to }: { icon: string; value: string; unit?: string; label: string; tone?: string; border?: string; to?: string }) {
  const body = (
    <>
      <span className="flex items-center gap-3 lg:gap-2 xl:gap-3">
        <img src={icon} alt="" className="size-8 pixelated lg:size-4 xl:size-8" />
        <span className={`font-pixel text-[44px] leading-[0.8] lg:short:text-[36px] ${tone}`}>{value}</span>
        {unit && <span className={`self-end font-pixel-label text-[9px] ${tone}`}>{unit}</span>}
      </span>
      <span className="truncate font-pixel-label text-[7px] text-secondary">{label}</span>
    </>
  );
  const cls = `${CARD} gap-3 px-4 py-4 lg:px-3 xl:px-4 lg:short:gap-2 lg:short:py-3 ${border}`;
  return to ? (
    <Link to={to} className={`${cls} hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Estante de trofeus (Fase 72): era a aba Conquistas - as badges num nicho cada, em cima de uma prateleira, e a proxima com a barra do que falta. */
export function TrophyShelf({ badges, onSeeAll }: { badges: BadgeDto[]; onSeeAll: () => void }) {
  const shown = knownBadges(badges);
  const achieved = shown.filter((b) => b.badge.achieved).length;
  const next = shown.find((b) => !b.badge.achieved && b.info.goal !== null);
  return (
    <section className={`${CARD} gap-4 border-stroke p-5 lg:short:gap-3 lg:short:p-4`}>
      <PanelLabel
        aside={
          <button type="button" onClick={onSeeAll} className="font-pixel-label text-[8px] text-secondary hover:text-accent">
            {achieved}/{shown.length} · Ver todas ›
          </button>
        }
      >
        Estante de troféus
      </PanelLabel>
      <div>
        <ul className="grid grid-cols-5 gap-2 px-1 sm:gap-4">
          {shown.map(({ badge, info }) => (
            <li key={badge.code} className="flex flex-col items-center gap-2" title={`${info.label}${badge.achieved ? '' : ` (${info.missing(badge.progress)})`}`}>
              <span className={`flex aspect-[6/7] w-full items-center justify-center border-2 lg:short:aspect-auto lg:short:h-16 lg:tight:h-14 ${badge.achieved ? 'border-accent/60 bg-stroke/50' : 'border-transparent bg-stroke/20'}`}>
                <img src={badge.achieved ? info.icon : lockIcon} alt="" className={`size-8 pixelated sm:size-12 ${badge.achieved ? '' : 'opacity-40'}`} />
              </span>
            </li>
          ))}
        </ul>
        <span className="block h-1.5 border-t-2 border-secondary bg-muted" aria-hidden="true" />
        <span className="block h-1 bg-stroke" aria-hidden="true" />
        <ul className="mt-2 grid grid-cols-5 gap-2 px-1 sm:gap-4">
          {shown.map(({ badge, info }) => (
            <li key={badge.code} className={`text-center font-pixel-label text-[6px] leading-tight sm:text-[7px] ${badge.achieved ? 'text-primary' : 'text-muted'}`}>
              {info.label}
            </li>
          ))}
        </ul>
      </div>
      {next && next.info.goal !== null && (
        <div className="flex flex-col gap-2 border-t-2 border-stroke pt-3">
          <div className="flex justify-between gap-2 font-pixel-label text-[8px]">
            <span className="text-primary">Próxima: {next.info.label}</span>
            <span className="text-project">{next.info.missing(next.badge.progress)}</span>
          </div>
          <SegmentedBar percentage={(Math.min(next.badge.progress, next.info.goal) / next.info.goal) * 100} label={`Progresso: ${next.info.label}`} segments={30} heightClass="h-3.5" tone="bg-project" />
        </div>
      )}
    </section>
  );
}

/** Atalho pro QG (Fase 72): nome, quem estudou hoje e a escalacao em miniatura. Sem squad, convida a montar um. */
export function SquadShortcut() {
  const { data, error } = useApiResource(() => api.getSquadHq(), []);
  const noSquad = error?.code === 'squad_nao_encontrado';
  return (
    <section className={`${CARD} gap-3 border-accent/60 p-5 lg:short:gap-2 lg:short:p-4`}>
      <PanelLabel>Seu squad</PanelLabel>
      {data ? (
        <>
          <p className="truncate font-pixel-label text-xl leading-none text-primary uppercase">{data.name}</p>
          <p className="font-pixel text-xl leading-none text-secondary">
            {data.members.length} {data.members.length === 1 ? 'agente' : 'agentes'} · {data.weeklyGoal.studiedToday} estudaram hoje
          </p>
          <ul className="flex items-end gap-1 overflow-hidden border-b-2 border-stroke pt-4" aria-hidden="true">
            {data.members.slice(0, 6).map((m) => {
              const look = lookFromDto(m.look);
              return (
                <li key={m.userId} className="relative flex w-10 justify-center">
                  {m.userId === data.ownerUserId && <img src={crownIcon} alt="" className="absolute -top-4 size-4 pixelated" />}
                  {look ? <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={2} /> : <span className="size-8" />}
                </li>
              );
            })}
          </ul>
        </>
      ) : noSquad ? (
        <p className="font-pixel text-xl leading-tight text-secondary">Sem squad ainda. Estudar junto segura a ofensiva.</p>
      ) : (
        <p className="font-pixel-label text-[8px] text-muted">Carregando...</p>
      )}
      <Link to="/squad" className="mt-auto border-2 border-accent py-3 lg:short:py-2.5 text-center font-pixel-label text-[10px] leading-none text-accent hover:bg-accent/10">
        {noSquad ? 'Montar um squad ›' : 'Entrar no QG ›'}
      </Link>
    </section>
  );
}

const DAY_STYLE: Record<StudyDayStatus, string> = {
  studied: 'bg-[#1c9e3e]',
  rest: 'bg-[#b37a00]',
  paused: 'border-2 border-dashed border-project/60',
  missed: 'bg-stroke/60',
  today: 'border-2 border-accent',
  before: 'bg-stroke/20',
};
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Ultimos 14 dias (Fase 72): estudou, folga, pausa (projeto aberto) ou faltou, e a ultima sessao. */
export function StudyCalendarCard() {
  const { data } = useApiResource(() => api.getStudyCalendar(), []);
  const studied = data?.days.filter((d) => d.status === 'studied').length ?? 0;
  const last = data?.lastSession ?? null;
  return (
    <section className={`${CARD} gap-4 border-stroke p-5 lg:short:gap-3 lg:short:p-4`}>
      <PanelLabel aside={data && <span className="font-pixel-label text-[8px] text-secondary">{studied} de 14</span>}>Últimos 14 dias</PanelLabel>
      {data ? (
        <>
          <ol className="grid grid-cols-7 gap-2 lg:short:grid-cols-14 lg:short:gap-1">
            {data.days.slice(0, 7).map((d) => (
              <li key={`h-${d.date}`} className="text-center font-pixel-label text-[6px] text-muted lg:short:hidden">
                {WEEKDAYS[new Date(`${d.date}T12:00:00`).getDay()]}
              </li>
            ))}
            {data.days.map((d) => (
              <li key={d.date} title={`${d.date.split('-').reverse().slice(0, 2).join('/')} · ${d.status}`} className={`flex aspect-square items-center justify-center ${DAY_STYLE[d.status]}`}>
                {d.status === 'studied' && <img src={checkIcon} alt="Estudou" className="size-4 pixelated lg:short:hidden" />}
                {d.status === 'today' && <span className="font-pixel-label text-[6px] text-accent lg:short:hidden">Hoje</span>}
              </li>
            ))}
          </ol>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            <Legend swatch="bg-[#1c9e3e]" label="Estudou" />
            <Legend swatch="bg-[#b37a00]" label="Folga" />
            <Legend swatch="border-2 border-dashed border-project/60" label="Pausa" />
            <Legend swatch="bg-stroke/60" label="Faltou" />
          </ul>
          <span className="h-0.5 bg-stroke" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
            <p className="font-pixel-label text-[7px] text-muted">Última sessão</p>
            <p className="font-pixel text-[22px] leading-none text-primary">
              {last ? `${last.isReinforcement ? 'Reforço do ' : ''}Dia ${last.dayNumber}${last.score !== null ? ` · nota ${Math.round(last.score)}` : ''} · ${sessionWhen(last.completedAt)}` : 'Nenhuma ainda'}
            </p>
          </div>
          <Link to="/hoje" className="mt-auto border-2 border-accent py-3 text-center font-pixel-label text-[10px] leading-none text-accent hover:bg-accent/10 lg:short:py-2.5">
            Ir pro Hoje ›
          </Link>
        </>
      ) : (
        <p className="font-pixel-label text-[8px] text-muted">Carregando...</p>
      )}
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5 font-pixel-label text-[6px] text-secondary">
      <span className={`size-2.5 ${swatch}`} aria-hidden="true" />
      {label}
    </li>
  );
}

function sessionWhen(iso: string): string {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `hoje ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `ontem ${time}`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const EDIT_LINK = '/onboarding/perfil?edit=1';

/** Dossie (Fase 72): era a aba Informacoes - interesses, notas, linguagem dos projetos e a conta. "Editar" continua indo pra entrevista. */
export function DossierCard({ user }: { user: UserDto }) {
  return (
    <section className={`${CARD} gap-3 border-stroke p-5 lg:short:gap-2 lg:short:p-4`}>
      <PanelLabel
        aside={
          <Link to={EDIT_LINK} className="font-pixel-label text-[8px] text-accent hover:underline">
            Editar ›
          </Link>
        }
      >
        Dossiê
      </PanelLabel>
      <p className="font-pixel-label text-[7px] text-muted">Interesses</p>
      {user.interests.length === 0 ? (
        <p className="font-pixel text-xl leading-tight text-secondary">Nenhum ainda. A Focada usa isso nas analogias da Leitura.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {user.interests.map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
        </ul>
      )}
      {user.additionalProfileNotes && <p className="font-pixel text-xl leading-tight break-words text-secondary">"{user.additionalProfileNotes}"</p>}
      <p className="mt-1 font-pixel-label text-[7px] text-muted">Linguagem dos projetos</p>
      {user.preferredLanguages.length === 0 ? (
        <p className="font-pixel text-xl leading-tight text-secondary">Nenhuma marcada.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {user.preferredLanguages.map((l) => (
            <Chip key={l} icon={terminalIcon}>
              {PROJECT_LANGUAGE_NAMES[l]}
            </Chip>
          ))}
        </ul>
      )}
      <span className="mt-auto h-0.5 bg-stroke" aria-hidden="true" />
      <p className="truncate font-pixel text-lg leading-none text-muted">{user.email} · somente leitura</p>
    </section>
  );
}

function Chip({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 border-2 border-accent/60 bg-stroke/30 px-2.5 py-0.5 font-pixel text-xl leading-tight text-primary">
      {icon && <img src={icon} alt="" className="size-4 pixelated" />}
      {children}
    </li>
  );
}
