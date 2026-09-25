import type { ReactNode } from 'react';
import type { RankingEntryDto, RankingScope } from '../../api/types';
import { lookFromDto, type AgentLook } from '../../lib/agentSprites';
import { MEDALS } from '../../lib/profileLook';
import { AgentSprite } from '../agent/AgentSprite';
import { ScrollArea } from '../ScrollArea';
import { SegmentedBar } from '../SegmentedBar';
import { PixelStage } from '../squad/pixelStage';
import checkIcon from '../../assets/pixel/check.png';
import terminalIcon from '../../assets/pixel/terminal.png';
import shieldIcon from '../../assets/pixel/escudo.png';

const SCOPES: { scope: RankingScope; label: string }[] = [
  { scope: 'weekly', label: 'Semana' },
  { scope: 'monthly', label: 'Mês' },
  { scope: 'course', label: 'Curso' },
];

const SCOPE_NAME: Record<RankingScope, string> = { weekly: 'Semana', monthly: 'Mês', course: 'Curso inteiro' };

/** Ordem no palco: 2º a esquerda, 1º no meio (mais alto), 3º a direita. */
const PODIUM = [
  { position: 2, height: 'h-28 lg:short:h-20 lg:tight:h-16' },
  { position: 1, height: 'h-[152px] lg:short:h-28 lg:tight:h-24' },
  { position: 3, height: 'h-20 lg:short:h-14 lg:tight:h-12' },
];

const score = (value: number) => value.toFixed(1);

/**
 * Podio do Ranking (Fase 72, Figma "Ranking — v2", node 133:4503): os 3 primeiros com o agente de
 * frente em cima dos blocos, holofote e piso; embaixo o recorte e a regra do Score. Os agentes caem de
 * 4x pra 3x em telas baixas (`short:`), pra tela caber sem rolar.
 */
export function PodiumPanel({
  top,
  userId,
  scope,
  onScope,
  notice,
}: {
  top: RankingEntryDto[];
  userId: string;
  scope: RankingScope;
  onScope: (scope: RankingScope) => void;
  notice: ReactNode;
}) {
  return (
    <section className="flex flex-col border-2 border-accent/60 bg-base shadow-[6px_6px_0_0_#1c9e3e] lg:min-h-0 lg:w-[42%] lg:max-w-[600px] lg:shrink-0">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="font-pixel-label text-[10px] text-accent">// Pódio</h2>
        <span className="border-2 border-stroke px-2.5 py-1 font-pixel-label text-[7px] text-secondary">Recorte: {SCOPE_NAME[scope]}</span>
      </div>

      <PixelStage className="flex flex-col justify-end lg:min-h-0 lg:flex-1" floor="bottom-[70px] lg:short:bottom-[62px]" steps={11}>
        {top.length === 0 ? (
          <p className="px-6 pb-24 text-center font-pixel text-2xl leading-tight text-secondary">Ninguém pontuou neste recorte ainda.</p>
        ) : (
          <div className="flex items-end justify-center px-3 pt-6">
            {PODIUM.map(({ position, height }) => {
              const entry = top.find((e) => e.position === position);
              return entry ? (
                <PodiumStep key={position} entry={entry} height={height} you={entry.userId === userId} />
              ) : (
                <span key={position} className="w-1/3 max-w-[160px]" />
              );
            })}
          </div>
        )}
      </PixelStage>

      <div className="flex flex-col gap-3 px-5 pt-3 pb-5 lg:shrink-0 lg:short:gap-2 lg:short:pb-4">
        <p className="font-pixel-label text-[8px] text-muted">Recorte</p>
        <div className="grid grid-cols-3 gap-3" role="tablist" aria-label="Recorte do ranking">
          {SCOPES.map((s) => (
            <button
              key={s.scope}
              type="button"
              role="tab"
              aria-selected={scope === s.scope}
              onClick={() => onScope(s.scope)}
              className={`border-2 py-3.5 font-pixel-label text-[10px] leading-none lg:short:py-2.5 ${
                scope === s.scope ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {notice}
        <p className="text-xs text-secondary">Score mede qualidade: 70% média das Dailies + 30% do Projeto Semanal. Semana só pontua depois de fechada.</p>
      </div>
    </section>
  );
}

function PodiumStep({ entry, height, you }: { entry: RankingEntryDto; height: string; you: boolean }) {
  const look = lookFromDto(entry.look);
  const first = entry.position === 1;
  return (
    <div className="flex w-1/3 max-w-[160px] flex-col items-center">
      {look ? (
        <>
          <AgentSprite look={look} scale={4} className="-mb-1 hidden lg:block lg:short:hidden" />
          <AgentSprite look={look} scale={3} className="-mb-1 lg:hidden lg:short:block" />
        </>
      ) : (
        <span className="mb-2 flex size-16 items-center justify-center border-2 border-dashed border-muted font-pixel text-3xl text-muted">?</span>
      )}
      <div className={`flex w-full flex-col items-center border-2 border-b-0 bg-stroke/60 ${height} ${you ? 'border-accent' : 'border-secondary/60'}`}>
        <span className={`h-1.5 w-full ${you ? 'bg-accent' : 'bg-secondary'}`} aria-hidden="true" />
        <img src={MEDALS[entry.position - 1]} alt={`${entry.position}º`} className="mt-3 size-12 pixelated lg:short:mt-2 lg:short:size-8" />
      </div>
      <div className="flex w-full flex-col items-center gap-1 border-t-2 border-secondary/60 pt-2">
        <span className={`max-w-full truncate font-pixel-label text-[10px] ${you ? 'text-accent' : 'text-primary'}`}>{you ? 'Você' : entry.displayName}</span>
        <span className={`font-pixel text-[34px] leading-none lg:short:text-[28px] ${first ? 'text-project' : 'text-primary'}`}>{score(entry.score)}</span>
      </div>
    </div>
  );
}

/**
 * Placar "HIGH SCORE" (Fase 72): top 10 no estilo fliperama - posicao com 2 digitos, mini agente,
 * linha pontilhada ate o score, 1º em ambar e a linha do aluno em verde com cursor piscando. Quem esta
 * fora do top 10 aparece no fim, depois de "· · ·". A lista rola por dentro se nao couber.
 */
export function ScoreBoard({ entries, me, userId, subtitle }: { entries: RankingEntryDto[]; me: RankingEntryDto | null; userId: string; subtitle: string }) {
  const meOutside = me && !entries.some((e) => e.userId === me.userId);
  return (
    <section className="pixel-box flex min-h-0 flex-col bg-base bg-[repeating-linear-gradient(0deg,transparent_0_3px,rgb(42_42_42/0.35)_3px_4px)] px-6 pt-5 pb-4 lg:flex-1 lg:short:pt-3 lg:short:pb-2">
      <p className="text-center font-pixel-label text-[22px] leading-none tracking-[0.2em] text-project lg:short:text-lg lg:tight:text-base">High score</p>
      <p className="mt-2 text-center font-pixel-label text-[8px] tracking-[0.1em] text-secondary">{subtitle}</p>
      <div className="mt-3 flex gap-3 border-b-2 border-stroke px-2 pb-2 font-pixel-label text-[8px] text-muted lg:short:mt-2 lg:short:pb-1">
        <span className="w-12">Pos</span>
        <span className="flex-1">Agente</span>
        <span>Score</span>
      </div>
      <ScrollArea className="mt-1 lg:min-h-0 lg:flex-1" contentClassName="lg:pr-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center font-pixel text-2xl text-secondary">Placar vazio por enquanto.</p>
        ) : (
          <ol className="flex flex-col">
            {entries.map((e) => (
              <ScoreRow key={e.userId} entry={e} you={e.userId === userId} />
            ))}
          </ol>
        )}
      </ScrollArea>
      {/* Fora do top 10: a linha do aluno fica presa no pe do placar, fora da rolagem - sempre visivel. */}
      {meOutside && (
        <ol className="shrink-0">
          <li className="py-0.5 text-center font-pixel text-2xl leading-none text-muted" aria-hidden="true">
            · · ·
          </li>
          <ScoreRow entry={me} you />
        </ol>
      )}
    </section>
  );
}

function ScoreRow({ entry, you }: { entry: RankingEntryDto; you: boolean }) {
  const look: AgentLook | null = lookFromDto(entry.look);
  const tone = entry.position === 1 ? 'text-project' : you ? 'text-accent' : 'text-primary';
  return (
    <li className={`flex items-center gap-3 border-2 px-2 py-0.5 lg:short:py-0 ${you ? 'border-accent bg-accent/10' : 'border-transparent'}`}>
      <span className={`flex w-12 items-center gap-0.5 font-pixel text-[28px] leading-none lg:short:text-2xl lg:tight:text-[22px] ${entry.position <= 3 ? tone : 'text-secondary'}`}>
        {you && <span className="text-xl text-accent">►</span>}
        {String(entry.position).padStart(2, '0')}
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center lg:tight:h-7">
        {look ? <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={2} /> : <span className="font-pixel text-xl text-muted">?</span>}
      </span>
      <span className={`shrink-0 truncate font-pixel-label text-[11px] ${tone} max-w-[40%]`}>{you ? 'Você' : entry.displayName}</span>
      <span className="mb-1.5 min-w-4 flex-1 self-end border-b-2 border-dotted border-stroke" aria-hidden="true" />
      <span className={`font-pixel text-[30px] leading-none lg:short:text-[26px] lg:tight:text-[22px] ${tone}`}>{score(entry.score)}</span>
      {you && <span className="h-5 w-1.5 animate-pulse bg-accent motion-reduce:animate-none" aria-hidden="true" />}
    </li>
  );
}

/** "Proximo alvo" (Fase 72): quanto falta pra passar quem esta logo acima; no topo, "defenda". */
export function NextTarget({ me, ahead, total }: { me: RankingEntryDto | null; ahead: RankingEntryDto | null; total: number }) {
  let title: string;
  let line: string;
  let percentage = 100;
  if (!me) {
    title = 'Fora do placar';
    line = 'Você não está matriculado neste curso.';
  } else if (!ahead) {
    title = 'Defenda o topo';
    line = total > 1 ? 'Você é o 1º. Cada Daily bem feita segura a posição.' : 'Por enquanto só você no placar.';
  } else {
    const gap = Math.max(0, ahead.score - me.score);
    title = me.position === 11 ? 'Rumo ao top 10' : `Rumo ao ${ahead.position}º lugar`;
    line = `Faltam ${gap.toFixed(1).replace('.', ',')} pontos pra ${ahead.displayName}.`;
    percentage = ahead.score > 0 ? (me.score / ahead.score) * 100 : 0;
  }
  return (
    <section className="flex min-w-0 flex-col gap-2 border-2 border-project/60 bg-base p-5 lg:short:p-4">
      <h2 className="font-pixel-label text-[10px] text-project">// Próximo alvo</h2>
      <p className="font-pixel text-[30px] leading-none text-primary">{title}</p>
      <p className="font-pixel text-xl leading-tight text-secondary">{line}</p>
      {me && <SegmentedBar percentage={percentage} label="Distância pro próximo alvo" segments={20} heightClass="h-3.5" tone="bg-project" />}
    </section>
  );
}

export function HowToClimb() {
  return (
    <section className="flex min-w-0 flex-col gap-3 border-2 border-stroke bg-base p-5 lg:short:gap-2 lg:short:p-4">
      <h2 className="font-pixel-label text-[10px] text-accent">// Como subir</h2>
      <ul className="flex flex-col gap-2.5 lg:short:gap-1.5">
        {[
          [checkIcon, 'Daily bem feita · 70% do score'],
          [terminalIcon, 'Projeto Semanal · 30%'],
          [shieldIcon, 'Reforço não soma, mas destrava'],
        ].map(([icon, text]) => (
          <li key={text} className="flex items-center gap-2.5 font-pixel text-[21px] leading-none text-primary">
            <img src={icon} alt="" className="size-4 pixelated" />
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
