import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DailyStatus, WeeklyProjectStatus, type CourseDetailDto, type DailyStatusSummaryDto, type MonthlyOverviewDto, type WeeklyOverviewDto } from '../../api/types';
import { REGION_HEIGHT, REGION_WIDTH, type MapRegion } from '../../lib/courseMaps';
import { isWeekDailiesDone, pendingReinforcementOf, primaryDays } from '../../lib/focadaMapLines';
import type { FocadaLine } from '../../lib/focadaLines';
import pontoConcluido from '../../assets/pixel/mapa/ponto-concluido.png';
import pontoEmAndamento from '../../assets/pixel/mapa/ponto-em-andamento.png';
import pontoDisponivel from '../../assets/pixel/mapa/ponto-disponivel.png';
import pontoTrancado from '../../assets/pixel/mapa/ponto-trancado.png';
import casteloTrancado from '../../assets/pixel/mapa/castelo-trancado.png';
import casteloPendente from '../../assets/pixel/mapa/castelo-pendente.png';
import casteloConcluido from '../../assets/pixel/mapa/castelo-concluido.png';
import badgeReforco from '../../assets/pixel/mapa/badge-reforco.png';
import focadaMarcador from '../../assets/pixel/mapa/focada-marcador.png';
import nevoaBorda from '../../assets/pixel/mapa/nevoa-borda.png';
import focadaNeutra from '../../assets/pixel/focada-neutra.png';

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

/** Passo da caminhada da Focada entre pontos (ms) - uma "casa" por vez, estilo mapa-mundi de jogo. */
const WALK_STEP_MS = 260;

function dayState(day: DailyStatusSummaryDto): DayState {
  if (day.status === DailyStatus.Completed) return 'concluido';
  if (day.status === DailyStatus.InProgress) return 'em-andamento';
  return day.isNext ? 'disponivel' : 'trancado';
}

function castleState(week: WeeklyOverviewDto): CastleState {
  if (week.projectStatus === WeeklyProjectStatus.Evaluated) return 'concluido';
  if (week.projectStatus === WeeklyProjectStatus.Submitted) return 'entregue';
  return isWeekDailiesDone(week) ? 'pendente' : 'trancado';
}

/** Posicao em % da arte (a arte escala junto com a largura da coluna). */
function at(x: number, y: number): CSSProperties {
  return { left: `${(x / REGION_WIDTH) * 100}%`, top: `${(y / REGION_HEIGHT) * 100}%` };
}
function size(px: number): CSSProperties {
  return { width: `${(px / REGION_WIDTH) * 100}%` };
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function positionKey(courseId: string) {
  return `focadu:mapa-posicao:${courseId}`;
}
function loadPosition(courseId: string): number | null {
  try {
    const raw = localStorage.getItem(positionKey(courseId));
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}
function savePosition(courseId: string, dayNumber: number) {
  try {
    localStorage.setItem(positionKey(courseId), String(dayNumber));
  } catch {
    // Sem armazenamento: a Focada so nao anda na proxima visita, aparece direto no ponto.
  }
}

function speechKey(courseId: string) {
  return `focadu:mapa-fala:${courseId}`;
}
/** A fala e nova (ainda nao apareceu sozinha pra este curso)? So le - marca com `markSpeechSeen` quando abre. */
function isNewSpeech(courseId: string, text: string): boolean {
  try {
    return localStorage.getItem(speechKey(courseId)) !== text;
  } catch {
    return false; // Sem armazenamento: nao abre sozinha (senao abriria em toda visita); o hover segue valendo.
  }
}
function markSpeechSeen(courseId: string, text: string) {
  try {
    localStorage.setItem(speechKey(courseId), text);
  } catch {
    // idem acima
  }
}

function findNext(weeks: WeeklyOverviewDto[]): { week: WeeklyOverviewDto; day: DailyStatusSummaryDto } | null {
  for (const week of weeks) {
    const day = primaryDays(week).find((d) => d.isNext);
    if (day) return { week, day };
  }
  return null;
}

type Selection = { kind: 'dia'; week: WeeklyOverviewDto; day: DailyStatusSummaryDto } | { kind: 'castelo'; week: WeeklyOverviewDto };

/**
 * Mapa da trilha (Fase 65, ver secret/rascunhos/mapa-da-trilha-pixel-art.md) - substitui a lista
 * de semanas na aba "Conteudo Programatico" quando o curso tem mapa desenhado. Uma regiao (arte
 * 384x192, mostrada na largura da coluna) por Monthly, com seletor de mes em cima.
 *
 * - Pontos (dias) e castelos (Projeto Semanal) sao botoes posicionados pelo mapa.json da regiao -
 *   clique abre o balao com dia/tema/status e o "ENTRAR". Ordem do DOM = ordem do caminho, entao
 *   teclado e leitor de tela percorrem o mapa em sequencia (cada botao tem o texto completo).
 * - Semanas trancadas ou ainda nao alcancadas ficam sob a nevoa (pontos inertes ali).
 * - A Focada fica parada em cima da proxima Daily; na 1a abertura depois de avancar, anda do ponto
 *   antigo ao novo (posicao guardada em localStorage). prefers-reduced-motion: aparece direto.
 * - Regiao sem arte (Monthly novo sem desenho): `renderFallback` - a lista de semanas de antes.
 * - `focadaLine` (fala do mapa, lib/focadaMapLines): balao em cima do marcador da Focada - abre
 *   sozinho quando a fala muda (depois da caminhada) e no hover/foco do marcador. Antes ficava numa
 *   coluna a esquerda do mapa (pedido do dono: tirar, gerava rolagem no monitor).
 */
export function CourseMap({
  course,
  courseId,
  regions,
  renderFallback,
  focadaLine = null,
}: {
  course: CourseDetailDto;
  courseId: string;
  regions: Map<number, MapRegion>;
  renderFallback: (monthly: MonthlyOverviewDto) => ReactNode;
  focadaLine?: FocadaLine | null;
}) {
  const monthlies = useMemo(() => [...course.monthlies].sort((a, b) => a.number - b.number), [course.monthlies]);
  const allWeeks = useMemo(() => monthlies.flatMap((m) => [...m.weeklies].sort((a, b) => a.number - b.number)), [monthlies]);
  const next = findNext(allWeeks);

  // Abre no mes da proxima Daily (ou no da ultima semana aberta, se nao ha proxima).
  const [monthlyNumber, setMonthlyNumber] = useState<number>(() => {
    const monthOf = (weekId: string | undefined) => monthlies.find((m) => m.weeklies.some((w) => w.id === weekId))?.number;
    const lastOpen = [...allWeeks].reverse().find((w) => !w.isLocked);
    return monthOf(next?.week.id) ?? monthOf(lastOpen?.id) ?? monthlies[0]?.number ?? 1;
  });
  const [selected, setSelected] = useState<Selection | null>(null);

  const monthlyIndex = monthlies.findIndex((m) => m.number === monthlyNumber);
  const monthly = monthlies[monthlyIndex];
  const region = monthly ? regions.get(monthly.number) : undefined;

  function goToMonthly(index: number) {
    const target = monthlies[index];
    if (!target) return;
    setSelected(null);
    setMonthlyNumber(target.number);
  }

  if (!monthly) return null;
  const title = region?.titulo ?? monthly.title;

  return (
    <div className="flex flex-col gap-3">
      {/* Altura fixa (h-8 + gap-3 = 44px): as colunas laterais do CourseDetailPage descem isso (lg:pt-11)
          pra comecar na mesma altura da caixa do mapa. */}
      <div className="flex h-8 items-center justify-between gap-4 font-pixel-label">
        <button
          type="button"
          onClick={() => goToMonthly(monthlyIndex - 1)}
          disabled={monthlyIndex <= 0}
          aria-label="Mês anterior"
          className="px-2 text-sm text-secondary hover:text-accent disabled:text-stroke"
        >
          {'<'}
        </button>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-xs text-primary">
            Mês {monthly.number} · {title}
          </p>
          <div className="flex gap-1.5" aria-hidden="true">
            {monthlies.map((m) => (
              <span key={m.id} className={`size-2 ${m.number === monthly.number ? 'bg-accent' : 'bg-stroke'}`} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => goToMonthly(monthlyIndex + 1)}
          disabled={monthlyIndex >= monthlies.length - 1}
          aria-label="Próximo mês"
          className="px-2 text-sm text-secondary hover:text-accent disabled:text-stroke"
        >
          {'>'}
        </button>
      </div>

      {region ? (
        <RegionView
          key={monthly.id}
          courseId={courseId}
          monthly={monthly}
          region={region}
          next={next}
          selected={selected}
          onSelect={setSelected}
          focadaLine={focadaLine}
        />
      ) : (
        renderFallback(monthly)
      )}
    </div>
  );
}

function RegionView({
  courseId,
  monthly,
  region,
  next,
  selected,
  onSelect,
  focadaLine,
}: {
  courseId: string;
  monthly: MonthlyOverviewDto;
  region: MapRegion;
  next: { week: WeeklyOverviewDto; day: DailyStatusSummaryDto } | null;
  selected: Selection | null;
  onSelect: (s: Selection | null) => void;
  focadaLine: FocadaLine | null;
}) {
  const weeks = useMemo(() => [...monthly.weeklies].sort((a, b) => a.number - b.number), [monthly.weeklies]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Nevoa: a partir da 1a semana do mes trancada ou alem da semana atual (a da proxima Daily).
  const fogIndex = weeks.findIndex((w) => w.isLocked || (next !== null && w.number > next.week.number));
  const fogWeek = fogIndex >= 0 ? weeks[fogIndex] : null;
  const fogX = fogIndex > 0 ? Math.max(0, (region.ilhas[fogIndex]?.[0] ?? REGION_WIDTH) - 8) : 0;
  const isFogged = (week: WeeklyOverviewDto) => fogIndex >= 0 && weeks.indexOf(week) >= fogIndex;

  // Caminhada da Focada: do ultimo ponto visto ate o atual, passando pelos dias no meio. Se a proxima
  // Daily esta numa semana trancada (projeto anterior pendente), ela para no castelo que bloqueia.
  // Trajeto calculado 1x na montagem (o efeito so agenda os passos - seguro com StrictMode).
  const nextHere = next && weeks.some((w) => w.id === next.week.id) ? next : null;
  const [walk] = useState(() => {
    if (!nextHere) return null;
    const nextDay = nextHere.day.dayNumber;
    const blocked = nextHere.week.isLocked;
    const target = blocked ? region.pontos[`projeto-semana-${nextHere.week.number - 1}`] : region.pontos[`dia-${nextDay}`];
    if (!target) return null;
    const days = weeks.flatMap((w) => primaryDays(w).map((d) => ({ dayNumber: d.dayNumber, point: region.pontos[`dia-${d.dayNumber}`] })));
    const last = loadPosition(courseId);
    const from = last !== null && last < nextDay ? days.find((d) => d.dayNumber === last)?.point : undefined;
    if (!from || prefersReducedMotion()) return { nextDay, start: target, path: [] as [number, number][] };
    const path = days.filter((d) => d.point && d.dayNumber > last! && d.dayNumber < nextDay).map((d) => d.point);
    path.push(target);
    return { nextDay, start: from, path };
  });
  const [walkPoint, setWalkPoint] = useState<[number, number] | null>(walk?.start ?? null);
  useEffect(() => {
    if (!walk) return;
    savePosition(courseId, walk.nextDay);
    const timers = walk.path.map((point, i) => window.setTimeout(() => setWalkPoint(point), (i + 1) * WALK_STEP_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [walk, courseId]);

  // Fala da Focada: 'auto' = abriu sozinha (fala nova; fica ate fechar/clicar fora), 'hover' = so
  // enquanto o mouse/foco esta no marcador. Abre depois que ela termina de andar.
  const [speech, setSpeech] = useState<'auto' | 'hover' | null>(null);
  const speechText = focadaLine?.text;
  useEffect(() => {
    if (!speechText || !isNewSpeech(courseId, speechText)) return;
    const timer = window.setTimeout(() => {
      markSpeechSeen(courseId, speechText);
      setSpeech('auto');
    }, (walk?.path.length ?? 0) * WALK_STEP_MS + 300);
    return () => window.clearTimeout(timer);
  }, [speechText, courseId, walk]);
  useEffect(() => {
    if (selected) setSpeech(null);
  }, [selected]);
  useEffect(() => {
    if (speech !== 'auto') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSpeech(null);
    }
    function onClick() {
      setSpeech(null);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [speech]);
  const showSpeech = (open: boolean) => setSpeech((s) => (open ? (s ?? 'hover') : s === 'hover' ? null : s));
  // Sem marcador neste mes (ex.: curso concluido, ou outro mes aberto): ela fica no canto do mapa.
  const speechAnchor: [number, number] | null = walkPoint ? [walkPoint[0], walkPoint[1] - 8 - 15] : null;

  // Fecha o balao com Esc ou clique fora.
  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onSelect(null);
    }
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onSelect(null);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [selected, onSelect]);

  return (
    <div ref={containerRef} className="pixel-box relative w-full overflow-hidden bg-base" style={{ aspectRatio: `${REGION_WIDTH} / ${REGION_HEIGHT}` }}>
      <img src={region.image} alt="" aria-hidden="true" className="absolute inset-0 size-full pixelated" />

      <ol className="contents" aria-label={`Mapa do mês ${monthly.number}`}>
        {weeks.map((week) => {
          const fogged = isFogged(week);
          const castlePoint = region.pontos[`projeto-semana-${week.number}`];
          return (
            <li key={week.id} className="contents">
              {primaryDays(week).map((day) => {
                const point = region.pontos[`dia-${day.dayNumber}`];
                if (!point) return null;
                const state = dayState(day);
                const reinforcement = pendingReinforcementOf(week, day);
                const label = `Dia ${day.dayNumber}, Semana ${week.number}${day.title ? `: ${day.title}` : ''}. ${DAY_LABEL[state]}${reinforcement ? ', com reforço pendente' : ''}.`;
                const isSel = selected?.kind === 'dia' && selected.day.id === day.id;
                return (
                  <MapSprite
                    key={day.id}
                    point={point}
                    px={16}
                    sprite={DAY_SPRITE[state]}
                    label={label}
                    inert={fogged}
                    active={isSel}
                    onClick={() => onSelect(isSel ? null : { kind: 'dia', week, day })}
                    badge={reinforcement ? badgeReforco : undefined}
                  />
                );
              })}
              {castlePoint && (
                <MapSprite
                  point={castlePoint}
                  px={32}
                  sprite={CASTLE_SPRITE[castleState(week)]}
                  label={`Projeto da Semana ${week.number}. ${CASTLE_LABEL[castleState(week)]}.`}
                  inert={fogged}
                  active={selected?.kind === 'castelo' && selected.week.id === week.id}
                  onClick={() =>
                    onSelect(selected?.kind === 'castelo' && selected.week.id === week.id ? null : { kind: 'castelo', week })
                  }
                />
              )}
            </li>
          );
        })}
      </ol>

      {walkPoint && (
        // Wrapper centraliza (translate); a imagem de dentro e que "respira" - as duas mexem em `translate`.
        // Hover/foco no marcador mostra a fala.
        <span
          className="absolute z-[5] -translate-x-1/2 transition-[left,top] duration-200 ease-linear"
          style={{ ...at(walkPoint[0], walkPoint[1] - 8 - 15), ...size(16) }}
          onMouseEnter={() => showSpeech(true)}
          onMouseLeave={() => showSpeech(false)}
          onFocus={() => showSpeech(true)}
          onBlur={() => showSpeech(false)}
          tabIndex={focadaLine ? 0 : undefined}
          aria-label={focadaLine ? `Focada: ${focadaLine.text}` : undefined}
          aria-hidden={focadaLine ? undefined : true}
        >
          <img src={focadaMarcador} alt="" className="block w-full pixelated motion-safe:animate-map-bob" />
        </span>
      )}
      {!walkPoint && focadaLine && (
        <span
          className="pixel-box absolute bottom-3 left-3 z-[5] bg-surface p-1"
          onMouseEnter={() => showSpeech(true)}
          onMouseLeave={() => showSpeech(false)}
          onFocus={() => showSpeech(true)}
          onBlur={() => showSpeech(false)}
          tabIndex={0}
          aria-label={`Focada: ${focadaLine.text}`}
        >
          <img src={focadaNeutra} alt="" className="block size-10 pixelated" />
        </span>
      )}

      {fogWeek && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex opacity-90" style={{ left: `${(fogX / REGION_WIDTH) * 100}%` }}>
          {fogIndex > 0 && <img src={nevoaBorda} alt="" aria-hidden="true" className="h-full pixelated" style={{ width: `${(8 / (REGION_WIDTH - fogX)) * 100}%` }} />}
          <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-base px-4 text-center font-pixel-label text-muted">
            <p className="text-xs">{fogIndex === 0 ? `Mês ${monthly.number}` : `Semana ${fogWeek.number}`}</p>
            <p className="text-[9px] leading-relaxed">
              {fogWeek.isLocked ? `Abre depois do projeto da Semana ${fogWeek.number - 1}` : 'Ainda não chegou a hora'}
            </p>
          </div>
        </div>
      )}

      {speech && focadaLine && (
        <SpeechBalloon line={focadaLine} anchor={speechAnchor} closable={speech === 'auto'} onClose={() => setSpeech(null)} />
      )}

      {selected && <Balloon courseId={courseId} selection={selected} region={region} onClose={() => onSelect(null)} />}
    </div>
  );
}

/** Balao da fala da Focada: em cima do marcador (ou embaixo, se ela esta no alto do mapa); sem marcador, no canto. */
function SpeechBalloon({
  line,
  anchor,
  closable,
  onClose,
}: {
  line: FocadaLine;
  anchor: [number, number] | null;
  closable: boolean;
  onClose: () => void;
}) {
  let style: CSSProperties;
  if (anchor) {
    const x = (anchor[0] / REGION_WIDTH) * 100;
    const y = (anchor[1] / REGION_HEIGHT) * 100;
    const below = anchor[1] < REGION_HEIGHT * 0.45;
    style = {
      left: `clamp(8px, calc(${x}% - 144px), calc(100% - 296px))`,
      // Marcador tem 16px de arte de altura: embaixo, o balao comeca depois dele.
      ...(below ? { top: `calc(${((anchor[1] + 16) / REGION_HEIGHT) * 100}% + 8px)` } : { bottom: `calc(${100 - y}% + 8px)` }),
    };
  } else {
    style = { left: '12px', bottom: '72px' };
  }
  return (
    <div
      role="status"
      className={`pixel-box absolute z-10 flex w-72 flex-col gap-1.5 bg-base px-4 pt-3 pb-3 ${closable ? '' : 'pointer-events-none'}`}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel-label text-[11px] text-accent">Focada</span>
        {closable && (
          <button type="button" onClick={onClose} aria-label="Fechar fala" className="font-pixel-label text-[10px] text-muted hover:text-primary">
            x
          </button>
        )}
      </div>
      <p className="font-pixel text-xl leading-snug text-primary">{line.text}</p>
    </div>
  );
}

function MapSprite({
  point,
  px,
  sprite,
  label,
  inert,
  active,
  onClick,
  badge,
}: {
  point: [number, number];
  px: number;
  sprite: string;
  label: string;
  inert: boolean;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  const style = { ...at(point[0], point[1]), ...size(px) };
  const img = <img src={sprite} alt="" aria-hidden="true" className="block w-full pixelated" />;
  if (inert) {
    return (
      <span className="absolute -translate-x-1/2 -translate-y-1/2" style={style} aria-hidden="true">
        {img}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${active ? 'scale-110' : ''}`}
      style={style}
    >
      {img}
      {badge && <img src={badge} alt="" aria-hidden="true" className="absolute -top-1/4 -right-1/4 w-1/2 pixelated" />}
    </button>
  );
}

function Balloon({
  courseId,
  selection,
  region,
  onClose,
}: {
  courseId: string;
  selection: Selection;
  region: MapRegion;
  onClose: () => void;
}) {
  const { week } = selection;
  const point = selection.kind === 'dia' ? region.pontos[`dia-${selection.day.dayNumber}`] : region.pontos[`projeto-semana-${week.number}`];
  if (!point) return null;
  const onRight = point[0] < REGION_WIDTH * 0.6;
  const style: CSSProperties = {
    top: `clamp(8px, calc(${(point[1] / REGION_HEIGHT) * 100}% - 60px), calc(100% - 170px))`,
    ...(onRight
      ? { left: `calc(${(point[0] / REGION_WIDTH) * 100}% + 28px)` }
      : { right: `calc(${100 - (point[0] / REGION_WIDTH) * 100}% + 28px)` }),
  };

  let kicker: string;
  let heading: string;
  let status: { text: string; tone: string };
  let primary: { label: string; to: string } | null = null;
  const secondary: { label: string; to: string }[] = [];
  const weekUrl = `/start?course=${courseId}&weekly=${week.id}`;

  if (selection.kind === 'dia') {
    const { day } = selection;
    const state = dayState(day);
    kicker = `Dia ${day.dayNumber} · Semana ${week.number}`;
    heading = day.title ?? `Dia ${day.dayNumber}`;
    status = { text: DAY_LABEL[state], tone: state === 'trancado' ? 'text-muted' : 'text-accent' };
    const reinforcement = pendingReinforcementOf(week, day);
    const dayLink = state === 'trancado' ? null : { label: state === 'concluido' ? 'Rever' : 'Entrar >', to: `/hoje?daily=${day.id}` };
    if (reinforcement) {
      primary = { label: 'Fazer reforço >', to: `/hoje?daily=${reinforcement.id}` };
      if (dayLink) secondary.push(dayLink);
    } else if (dayLink && state !== 'concluido') {
      primary = dayLink;
    } else if (dayLink) {
      secondary.push(dayLink);
    }
  } else {
    const state = castleState(week);
    kicker = `Projeto · Semana ${week.number}`;
    heading = week.theme ?? week.title;
    status = {
      text: CASTLE_LABEL[state],
      tone: state === 'concluido' ? 'text-accent' : state === 'trancado' ? 'text-muted' : 'text-project',
    };
    if (state !== 'trancado') primary = { label: 'Abrir projeto >', to: `${weekUrl}&project=1` };
  }
  secondary.push({ label: 'Ver semana', to: weekUrl });

  return (
    <div role="dialog" aria-label={kicker} className="pixel-box absolute z-10 flex w-56 flex-col gap-2 bg-base p-4" style={style}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-pixel-label text-[9px] text-secondary">{kicker}</p>
        <button type="button" onClick={onClose} aria-label="Fechar" className="font-pixel-label text-[10px] text-muted hover:text-primary">
          x
        </button>
      </div>
      <p className="font-pixel text-xl leading-tight text-primary">{heading}</p>
      <p className={`flex items-center gap-1.5 font-pixel-label text-[9px] ${status.tone}`}>
        <span className="size-1.5 bg-current" aria-hidden="true" />
        {status.text}
      </p>
      {primary && (
        <Link to={primary.to} className="mt-1 bg-accent py-2 text-center font-pixel-label text-[10px] text-base hover:brightness-110">
          {primary.label}
        </Link>
      )}
      <div className="flex gap-4 font-pixel-label text-[9px]">
        {secondary.map((a) => (
          <Link key={a.label} to={a.to} className="text-secondary underline-offset-4 hover:text-primary hover:underline">
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
