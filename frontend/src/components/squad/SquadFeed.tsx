import { useState } from 'react';
import { api } from '../../api/client';
import type { SquadActivityDto, SquadActivityType, SquadMemberDto } from '../../api/types';
import { lookFromDto } from '../../lib/agentSprites';
import { RARITY_STYLE } from '../../lib/cosmeticStyle';
import { AgentSprite } from '../agent/AgentSprite';
import { ScrollArea } from '../ScrollArea';
import { PanelLabel } from './pixelStage';
import checkIcon from '../../assets/pixel/check.png';
import terminalIcon from '../../assets/pixel/terminal.png';
import gemIcon from '../../assets/pixel/gema.png';
import flagIcon from '../../assets/pixel/bandeira.png';
import shieldIcon from '../../assets/pixel/escudo.png';

type Filter = 'tudo' | 'estudos' | 'squad' | 'loja';

const FILTERS: { id: Filter; label: string; types: SquadActivityType[] | null }[] = [
  { id: 'tudo', label: 'Tudo', types: null },
  { id: 'estudos', label: 'Estudos', types: ['daily', 'reinforcement', 'project'] },
  { id: 'squad', label: 'Squad', types: ['joined', 'agent'] },
  { id: 'loja', label: 'Loja', types: ['purchase'] },
];

const ICON: Record<SquadActivityType, string> = {
  daily: checkIcon,
  reinforcement: shieldIcon,
  project: terminalIcon,
  purchase: gemIcon,
  agent: checkIcon,
  joined: flagIcon,
};

/**
 * Feed de ultimas atividades do QG (Fase 72, Figma node 121:6971) - separado por dia, com filtros e o
 * GG de um toque (sem comentario livre). O backend deriva as atividades das datas que ja existem; aqui
 * so vira frase. Na propria linha o GG vira "Recebeu N" (nao da pra dar GG em si mesmo).
 *
 * Filtros do Figma eram Tudo/Estudos/Conquistas/Loja; "Conquistas" virou "Squad" porque badge nao tem
 * data de conquista e nao entra no feed (ver GetSquadHqUseCase) - sobrou entrada no squad e agente novo.
 */
export function SquadFeed({ feed, members, userId }: { feed: SquadActivityDto[]; members: SquadMemberDto[]; userId: string }) {
  const [filter, setFilter] = useState<Filter>('tudo');
  const [cheers, setCheers] = useState<Record<string, { cheers: number; cheeredByMe: boolean }>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const looks = new Map(members.map((m) => [m.userId, lookFromDto(m.look)]));

  const types = FILTERS.find((f) => f.id === filter)!.types;
  const shown = feed.filter((a) => !types || types.includes(a.type));
  const groups = groupByDay(shown);

  async function toggle(activity: SquadActivityDto) {
    setBusyKey(activity.key);
    try {
      const result = await api.toggleSquadCheer(activity.key);
      setCheers((prev) => ({ ...prev, [activity.key]: { cheers: result.cheers, cheeredByMe: result.cheeredByMe } }));
    } catch {
      // GG e um detalhe - se falhar, o botao so volta como estava.
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 border-2 border-stroke bg-base p-5 lg:min-h-0 lg:flex-1">
      <PanelLabel
        aside={
          <div className="flex flex-wrap justify-end gap-1.5" role="tablist" aria-label="Filtrar atividades">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`border-2 px-2.5 py-1.5 font-pixel-label text-[8px] leading-none ${
                  filter === f.id ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        Últimas atividades
      </PanelLabel>
      <span className="h-0.5 shrink-0 bg-stroke" aria-hidden="true" />

      <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="lg:pr-4">
        {groups.length === 0 ? (
          <p className="py-6 font-pixel text-xl leading-tight text-secondary">
            {filter === 'tudo' ? 'Nada nos últimos 14 dias. A primeira Daily de alguém aparece aqui.' : 'Nada disso nos últimos 14 dias.'}
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {groups.map((g) => (
              <li key={g.label} className="flex flex-col gap-1">
                <p className="mt-2 flex items-center gap-3 font-pixel-label text-[8px] text-muted">
                  {g.label}
                  <span className="h-0.5 flex-1 bg-stroke/60" aria-hidden="true" />
                </p>
                <ol className="flex flex-col gap-1">
                  {g.items.map((a) => {
                    const state = cheers[a.key] ?? { cheers: a.cheers, cheeredByMe: a.cheeredByMe };
                    return (
                      <FeedRow
                        key={a.key}
                        activity={a}
                        look={looks.get(a.userId) ?? null}
                        mine={a.userId === userId}
                        cheers={state.cheers}
                        cheeredByMe={state.cheeredByMe}
                        busy={busyKey === a.key}
                        onCheer={() => toggle(a)}
                      />
                    );
                  })}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </section>
  );
}

function FeedRow({
  activity,
  look,
  mine,
  cheers,
  cheeredByMe,
  busy,
  onCheer,
}: {
  activity: SquadActivityDto;
  look: ReturnType<typeof lookFromDto>;
  mine: boolean;
  cheers: number;
  cheeredByMe: boolean;
  busy: boolean;
  onCheer: () => void;
}) {
  const tag = activityTag(activity);
  return (
    <li className={`flex items-center gap-2 px-1 py-1.5 sm:gap-3 sm:px-2 ${mine ? 'bg-accent/10' : ''}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center overflow-hidden border-2 bg-surface sm:size-12 ${mine ? 'border-accent/60' : 'border-transparent'}`}>
        {look ? <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={2} /> : <span className="font-pixel text-2xl text-muted">?</span>}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex min-w-0 items-center gap-2 font-pixel-label text-[9px]">
          <span className={`truncate ${mine ? 'text-accent' : 'text-primary'}`}>{mine ? 'Você' : activity.displayName}</span>
          <span className="shrink-0 text-[8px] text-muted">· {timeLabel(activity.occurredAt)}</span>
        </p>
        <p className="flex min-w-0 items-start gap-2 font-pixel text-[19px] leading-[1.05] text-primary sm:text-[21px]">
          <img src={ICON[activity.type]} alt="" className="mt-0.5 size-4 shrink-0 pixelated" />
          <span className="min-w-0">{activityText(activity)}</span>
        </p>
        {tag && (
          <span className={`w-fit border-2 px-2 py-1 font-pixel-label text-[7px] leading-none sm:hidden ${tag.tone}`}>{tag.label}</span>
        )}
      </div>
      {tag && <span className={`hidden shrink-0 border-2 px-2.5 py-1.5 font-pixel-label text-[7px] leading-none sm:inline ${tag.tone}`}>{tag.label}</span>}
      {mine ? (
        <span className="w-16 shrink-0 border-2 border-secondary/60 py-1 text-center font-pixel text-lg sm:w-[84px] sm:text-xl leading-none text-secondary">
          {cheers > 0 ? <><span className="sm:hidden">+{cheers} GG</span><span className="hidden sm:inline">Recebeu {cheers}</span></> : 'GG 0'}
        </span>
      ) : (
        <button
          type="button"
          onClick={onCheer}
          disabled={busy}
          aria-pressed={cheeredByMe}
          aria-label={`Dar GG pra ${activity.displayName}`}
          className={`w-16 shrink-0 border-2 py-1 font-pixel text-lg leading-none sm:w-[84px] sm:text-xl disabled:opacity-60 ${
            cheeredByMe ? 'border-accent bg-accent text-base' : 'border-secondary/60 text-secondary hover:border-accent hover:text-accent'
          }`}
        >
          GG {cheers}
        </button>
      )}
    </li>
  );
}

/** Frase da atividade, na voz do feed ("concluiu o Dia 12 · nota 92"). */
function activityText(a: SquadActivityDto): string {
  const score = a.score !== null ? ` · nota ${Math.round(a.score)}` : '';
  switch (a.type) {
    case 'daily':
      return `concluiu o Dia ${a.dayNumber}${score}`;
    case 'reinforcement':
      return `fez o reforço do Dia ${a.dayNumber}`;
    case 'project':
      return `teve o Projeto da Semana ${a.weekNumber} avaliado${score}`;
    case 'purchase':
      return `comprou ${a.itemName}`;
    case 'agent':
      return 'entrou em campo com o agente novo';
    case 'joined':
      return 'entrou no squad';
  }
}

function activityTag(a: SquadActivityDto): { label: string; tone: string } | null {
  if (a.type === 'purchase' && a.itemRarity !== null) {
    const style = RARITY_STYLE[a.itemRarity];
    return { label: `Loja · ${style.label}`, tone: `${style.border} ${style.text}` };
  }
  if (a.type === 'project') return { label: `Semana ${a.weekNumber}`, tone: 'border-accent text-accent' };
  if (a.type === 'reinforcement') return { label: 'Reforço', tone: 'border-project text-project' };
  return null;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Agrupa por dia local: "Hoje", "Ontem", "22/09". O feed ja vem do mais novo pro mais velho. */
function groupByDay(feed: SquadActivityDto[]): { label: string; items: SquadActivityDto[] }[] {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const groups: { label: string; items: SquadActivityDto[] }[] = [];
  for (const a of feed) {
    const d = new Date(a.occurredAt);
    const key = localDayKey(d);
    const label = key === localDayKey(today) ? 'Hoje' : key === localDayKey(yesterday) ? 'Ontem' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(a);
    else groups.push({ label, items: [a] });
  }
  return groups;
}

/** "há 8 min", "há 3 h" hoje; "21:40" nos outros dias (o dia ja esta no separador). */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  const minutes = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (localDayKey(d) === localDayKey(new Date())) {
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `há ${minutes} min`;
    return `há ${Math.floor(minutes / 60)} h`;
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
