import type { SquadHqDto, SquadMemberDto } from '../../api/types';
import { lookFromDto } from '../../lib/agentSprites';
import { AgentSprite } from '../agent/AgentSprite';
import { SegmentedBar } from '../SegmentedBar';
import { PanelLabel, PixelStage } from './pixelStage';
import crownIcon from '../../assets/pixel/coroa.png';
import checkIcon from '../../assets/pixel/check.png';
import gemIcon from '../../assets/pixel/gema.png';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "ago/2026" a partir de uma data ISO. */
function monthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}

/**
 * Cabecalho do QG do Squad (Fase 72, Figma node 121:6971): nome, codigo de convite e lideranca a
 * esquerda; a escalacao no meio (cada membro de pe com o proprio agente, coroa no lider, marca VOCE e
 * se ja estudou hoje); a meta da semana a direita. Abaixo de `lg` os 3 blocos empilham.
 */
export function SquadHero({ hq, userId, onInvite }: { hq: SquadHqDto; userId: string; onInvite: () => void }) {
  const isOwner = hq.ownerUserId === userId;
  const leader = hq.members.find((m) => m.userId === hq.ownerUserId);
  const coLeader = hq.members.find((m) => m.userId === hq.coLeaderUserId);
  const leadLine = [isOwner ? 'Você lidera' : leader && `Líder ${leader.displayName}`, coLeader && `co-líder ${coLeader.userId === userId ? 'você' : coLeader.displayName}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="flex flex-col border-2 border-accent/60 bg-base shadow-[6px_6px_0_0_#1c9e3e] lg:flex-row">
      <div className="flex shrink-0 flex-col gap-3 p-5 lg:w-[300px] lg:border-r-2 lg:border-stroke xl:w-[340px] lg:short:gap-2 lg:short:p-4">
        <PanelLabel>QG do squad</PanelLabel>
        <h1 className="font-pixel-label text-3xl leading-none break-words text-primary uppercase lg:short:text-2xl">{hq.name}</h1>
        <p className="font-pixel text-[22px] leading-none text-secondary">
          {hq.members.length} {hq.members.length === 1 ? 'agente' : 'agentes'} · desde {monthYear(hq.createdAt)}
        </p>
        {leadLine && (
          <p className="flex items-center gap-2 font-pixel-label text-[8px] text-project">
            <img src={crownIcon} alt="" className="size-4 pixelated" />
            {leadLine}
          </p>
        )}
        <p className="mt-1 font-pixel-label text-[8px] text-muted lg:short:mt-0">Código de convite</p>
        <div className="flex gap-2">
          <span className="flex flex-1 items-center justify-center border-2 border-accent/60 bg-surface px-3 py-2 font-pixel text-[30px] leading-none tracking-[4px] text-accent lg:short:py-1 lg:short:text-[26px]">
            {hq.joinCode}
          </span>
          <button
            type="button"
            onClick={onInvite}
            className="shrink-0 border-2 border-accent bg-accent px-4 font-pixel-label text-[10px] leading-none text-base hover:brightness-110"
          >
            Convidar ›
          </button>
        </div>
      </div>

      <Lineup members={hq.members} ownerUserId={hq.ownerUserId} coLeaderUserId={hq.coLeaderUserId} userId={userId} />

      <WeeklyGoal goal={hq.weeklyGoal} memberCount={hq.members.length} />
    </section>
  );
}

function Lineup({ members, ownerUserId, coLeaderUserId, userId }: { members: SquadMemberDto[]; ownerUserId: string; coLeaderUserId: string | null; userId: string }) {
  return (
    <PixelStage className="min-w-0 flex-1 border-y-2 border-stroke lg:border-y-0 lg:border-r-2" floor="bottom-[58px]" steps={9}>
      <ul className="scrollbar-none flex items-end justify-center-safe gap-1 overflow-x-auto px-2 pt-6 pb-3 sm:gap-2 lg:pt-10 min-[1400px]:gap-4 lg:short:pt-4 lg:short:pb-2">
        {members.map((m) => (
          <LineupMember key={m.userId} member={m} you={m.userId === userId} leader={m.userId === ownerUserId} coLeader={m.userId === coLeaderUserId} />
        ))}
      </ul>
    </PixelStage>
  );
}

function LineupMember({ member, you, leader, coLeader }: { member: SquadMemberDto; you: boolean; leader: boolean; coLeader: boolean }) {
  const look = lookFromDto(member.look);
  const status = member.studiedToday ? null : you ? 'Ainda não' : lastStudiedLabel(member.lastStudiedOn);
  return (
    <li className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 sm:w-16 min-[1400px]:w-[84px]" title={member.displayName}>
      <span className="flex h-7 flex-col items-center justify-end">
        {you ? (
          <span className="flex flex-col items-center gap-1 font-pixel-label text-[8px] text-accent">
            Você
            <span className="block h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-accent" />
          </span>
        ) : leader ? (
          <img src={crownIcon} alt="Líder" className="size-6 pixelated" />
        ) : null}
      </span>
      {look ? (
        <>
          <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={3} className="min-[1400px]:hidden" />
          <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={4} className="hidden min-[1400px]:block" />
        </>
      ) : (
        <span className="flex size-12 min-[1400px]:size-16 items-center justify-center border-2 border-dashed border-muted font-pixel text-3xl text-muted">?</span>
      )}
      <span className={`mt-3 max-w-full truncate font-pixel-label text-[9px] ${you ? 'text-accent' : 'text-primary'}`}>
        {you ? 'Você' : member.displayName}
        {coLeader && <span className="text-project"> · co</span>}
      </span>
      {member.studiedToday ? (
        <span className="flex items-center gap-1 font-pixel-label text-[7px] text-accent">
          <img src={checkIcon} alt="" className="size-4 pixelated" />
          Hoje
        </span>
      ) : (
        <span className={`h-4 font-pixel-label text-[7px] leading-4 ${you ? 'text-project' : 'text-muted'}`}>{status}</span>
      )}
    </li>
  );
}

/** "Ontem", "22/09" ou "—" - o dia (local) em que o membro estudou por ultimo, quando nao foi hoje. */
function lastStudiedLabel(lastStudiedOn: string | null): string {
  if (!lastStudiedOn) return '—';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const [y, m, d] = lastStudiedOn.split('-');
  const sameDay = Number(y) === yesterday.getFullYear() && Number(m) === yesterday.getMonth() + 1 && Number(d) === yesterday.getDate();
  return sameDay ? 'Ontem' : `${d}/${m}`;
}

function WeeklyGoal({ goal, memberCount }: { goal: SquadHqDto['weeklyGoal']; memberCount: number }) {
  const left = Math.max(0, goal.target - goal.completed);
  const done = left === 0;
  return (
    <div className="flex shrink-0 flex-col gap-3 p-5 lg:w-[260px] xl:w-[300px] lg:short:gap-2 lg:short:p-4">
      <PanelLabel>Meta da semana</PanelLabel>
      <p className="flex items-end gap-3">
        <span className={`font-pixel text-[56px] leading-[0.8] lg:short:text-[44px] ${done ? 'text-accent' : 'text-primary'}`}>
          {goal.completed}/{goal.target}
        </span>
        <span className="font-pixel-label text-[8px] leading-tight text-secondary">
          Dailies
          <br />
          juntos
        </span>
      </p>
      <SegmentedBar percentage={(goal.completed / goal.target) * 100} label="Meta da semana do squad" segments={15} heightClass="h-[18px] lg:short:h-3" />
      <p className="font-pixel text-xl leading-none text-secondary">{done ? 'Meta batida! Bora passar dela.' : `Faltam ${left} até domingo.`}</p>
      <span className="h-0.5 bg-stroke" aria-hidden="true" />
      <p className="flex items-center gap-2 font-pixel-label text-[7px] text-muted">
        <img src={gemIcon} alt="" className="size-4 pixelated opacity-60" />
        Recompensa em Gems chegando em breve
      </p>
      <p className="font-pixel text-xl leading-none text-primary">
        {goal.studiedToday} de {memberCount} estudaram hoje
      </p>
    </div>
  );
}
