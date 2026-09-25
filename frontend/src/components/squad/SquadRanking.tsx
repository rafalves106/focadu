import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { RankingEntryDto, RankingScope, SquadMemberDto } from '../../api/types';
import { lookFromDto, type AgentLook } from '../../lib/agentSprites';
import { MEDALS } from '../../lib/profileLook';
import { AgentSprite } from '../agent/AgentSprite';
import { PixelConfirmDialog } from '../PixelConfirmDialog';
import { ScrollArea } from '../ScrollArea';
import { PanelLabel } from './pixelStage';
import crownIcon from '../../assets/pixel/coroa.png';

const SCOPES: { scope: RankingScope; label: string }[] = [
  { scope: 'weekly', label: 'Semana' },
  { scope: 'monthly', label: 'Mês' },
  { scope: 'course', label: 'Curso' },
];

/** Ordem no palco: 2º a esquerda, 1º no meio (mais alto), 3º a direita. */
const PODIUM = [
  { position: 2, height: 'h-16 lg:[@media(max-height:940px)]:h-11' },
  { position: 1, height: 'h-[88px] lg:[@media(max-height:940px)]:h-14' },
  { position: 3, height: 'h-12 lg:[@media(max-height:940px)]:h-8' },
];

/**
 * Ranking do QG (Fase 72, Figma node 121:6971/125:9441) - podio com os agentes em cima dos blocos e o
 * resto em lista, recorte Semana/Mes/Curso (mesmo endpoint da Fase 24). O lider gerencia pelo "⋯" de
 * cada linha (tornar/rebaixar co-lider, remover); sair do squad pede confirmacao da Focada e avisa
 * quem assume a lideranca (regra de LeaveSquadUseCase).
 */
export function SquadRanking({
  members,
  ownerUserId,
  coLeaderUserId,
  userId,
  onChanged,
}: {
  members: SquadMemberDto[];
  ownerUserId: string;
  coLeaderUserId: string | null;
  userId: string;
  onChanged: () => void;
}) {
  const [scope, setScope] = useState<RankingScope>('weekly');
  const [page, setPage] = useState(1);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data, retry } = useApiResource(() => api.getSquadRanking(scope, page), [scope, page]);
  const looks = new Map(members.map((m) => [m.userId, lookFromDto(m.look)]));
  const isOwner = ownerUserId === userId;

  async function run(action: () => Promise<void>, fail: string, after: () => void = onChanged) {
    setError(null);
    setBusy(true);
    try {
      await action();
      setMenuFor(null);
      retry();
      after();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : fail);
    } finally {
      setBusy(false);
    }
  }

  const entries = data?.members ?? [];
  const top = page === 1 ? entries.filter((e) => e.position <= 3) : [];
  const rest = page === 1 ? entries.filter((e) => e.position > 3) : entries;
  const totalPages = data ? Math.max(1, Math.ceil(data.totalMembers / data.pageSize)) : 1;
  const successor = isOwner ? (members.find((m) => m.userId === coLeaderUserId) ?? members.filter((m) => m.userId !== userId).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0]) : null;

  const toggleMenu = (id: string) => setMenuFor((v) => (v === id ? null : id));

  /** Menu do lider (tornar/tirar co-lider, remover) - abre embaixo da linha ou do nome no podio. */
  function manageMenu(entry: RankingEntryDto, placement: string) {
    const coLeader = entry.userId === coLeaderUserId;
    return (
      <div className={`absolute top-full z-10 mt-1 flex w-56 flex-col gap-3 border-2 border-project bg-base p-4 text-left shadow-[6px_6px_0_0_#000] ${placement}`}>
        <p className="font-pixel-label text-[8px] text-secondary">{entry.displayName}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            coLeader
              ? run(() => api.clearSquadCoLeader(), 'Não foi possível rebaixar o co-líder.')
              : run(() => api.promoteSquadCoLeader(entry.userId), 'Não foi possível promover este membro.')
          }
          className="text-left font-pixel-label text-[9px] text-primary hover:text-accent disabled:opacity-40"
        >
          {coLeader ? 'Tirar de co-líder' : 'Tornar co-líder'}
        </button>
        <span className="h-0.5 bg-stroke" aria-hidden="true" />
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => api.removeSquadMember(entry.userId), 'Não foi possível remover este membro.')}
          className="text-left font-pixel-label text-[9px] text-alert hover:brightness-125 disabled:opacity-40"
        >
          Remover do squad
        </button>
      </div>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 border-2 border-stroke bg-base p-5 lg:min-h-0 lg:w-[400px] lg:shrink-0 xl:w-[472px] lg:short:p-4">
      <PanelLabel
        aside={
          <div className="flex gap-1.5">
            {SCOPES.map((s) => (
              <button
                key={s.scope}
                type="button"
                onClick={() => {
                  setScope(s.scope);
                  setPage(1);
                }}
                aria-pressed={scope === s.scope}
                className={`border-2 px-2.5 py-1.5 font-pixel-label text-[8px] leading-none ${
                  scope === s.scope ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        Ranking
      </PanelLabel>

      <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="flex flex-col gap-3 lg:pr-4">
        {top.length > 0 && (
          <div className="flex items-end justify-center gap-0 border-b-2 border-secondary/60 pt-2">
            {PODIUM.map(({ position, height }) => {
              const entry = top.find((e) => e.position === position);
              return entry ? (
                <PodiumStep key={position} entry={entry} height={height} look={looks.get(entry.userId) ?? null} you={entry.userId === userId} leader={entry.userId === ownerUserId} />
              ) : (
                <span key={position} className="w-[104px]" />
              );
            })}
          </div>
        )}
        {top.length > 0 && (
          <div className="flex justify-center">
            {PODIUM.map(({ position }) => {
              const entry = top.find((e) => e.position === position);
              const you = entry?.userId === userId;
              return (
                <span key={position} className="relative flex w-[104px] flex-col items-center gap-1">
                  {entry && (
                    <>
                      <span className={`flex max-w-full items-center gap-1 font-pixel-label text-[9px] ${you ? 'text-accent' : 'text-primary'}`}>
                        <span className="truncate">{you ? 'Você' : entry.displayName}</span>
                        {isOwner && !you && <ManageButton entry={entry} open={menuFor === entry.userId} onToggle={toggleMenu} />}
                      </span>
                      <span className="font-pixel text-[22px] leading-none text-secondary">{entry.score.toFixed(1)}</span>
                      {menuFor === entry.userId && manageMenu(entry, 'left-1/2 -translate-x-1/2')}
                    </>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {error && <p className="font-pixel text-lg text-alert">{error}</p>}

        <ol className="flex flex-col gap-1.5">
          {rest.map((entry) => {
            const you = entry.userId === userId;
            const coLeader = entry.userId === coLeaderUserId;
            const canManage = isOwner && !you;
            return (
              <li key={entry.userId} className="relative">
                <div className={`flex items-center gap-3 border-2 bg-surface px-3 py-1 lg:short:py-0 ${menuFor === entry.userId ? 'border-project' : you ? 'border-accent/60' : 'border-transparent'}`}>
                  <span className="w-7 font-pixel text-[22px] leading-none text-secondary">{entry.position}º</span>
                  <MiniAgent look={looks.get(entry.userId) ?? null} />
                  <span className={`min-w-0 flex-1 truncate font-pixel-label text-[9px] ${you ? 'text-accent' : 'text-primary'}`}>
                    {you ? 'Você' : entry.displayName}
                    {coLeader && <span className="text-project"> · co-líder</span>}
                  </span>
                  <span className="font-pixel text-[22px] leading-none text-primary">{entry.score.toFixed(1)}</span>
                  {canManage && <ManageButton entry={entry} open={menuFor === entry.userId} onToggle={toggleMenu} />}
                </div>
                {menuFor === entry.userId && manageMenu(entry, 'right-0')}
              </li>
            );
          })}
        </ol>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 font-pixel-label text-[8px]">
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="text-accent disabled:opacity-40">
              ‹ Anterior
            </button>
            <span className="text-secondary">
              {page} de {totalPages}
            </span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="text-accent disabled:opacity-40">
              Próxima ›
            </button>
          </div>
        )}

        <span className="h-0.5 bg-stroke" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-2 font-pixel-label text-[8px]">
          <span className="text-secondary">{data ? `Total ${data.totalScore.toFixed(1)} · média ${data.averageScore.toFixed(1)}` : ' '}</span>
          <button type="button" onClick={() => setConfirmLeave(true)} disabled={busy} className="text-alert hover:brightness-125 disabled:opacity-40">
            Sair do squad
          </button>
        </div>
      </ScrollArea>

      <PixelConfirmDialog
        open={confirmLeave}
        message={
          isOwner && successor
            ? `Sair do squad? A liderança passa pra ${successor.displayName}.`
            : isOwner
              ? 'Sair do squad? Você é o último: o squad deixa de existir.'
              : 'Sair do squad? Dá pra entrar de novo com o código.'
        }
        confirmLabel="Sair"
        cancelLabel="Ficar"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          void run(() => api.leaveSquad(userId), 'Não foi possível sair do squad.');
        }}
      />
    </section>
  );
}

function PodiumStep({ entry, height, look, you, leader }: { entry: RankingEntryDto; height: string; look: AgentLook | null; you: boolean; leader: boolean }) {
  return (
    <div className="flex w-[104px] flex-col items-center">
      <span className="flex h-5 items-end">{leader && <img src={crownIcon} alt="Líder" className="size-4 pixelated" />}</span>
      {/* Telas baixas (Fase 72): podio mais baixo e agentes em 2x, pra lista caber sem rolar. */}
      {look ? (
        <>
          <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={3} className="lg:[@media(max-height:940px)]:hidden" />
          <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={2} className="hidden lg:[@media(max-height:940px)]:block" />
        </>
      ) : (
        <span className="size-12 lg:[@media(max-height:940px)]:size-8" />
      )}
      <div className={`flex w-full flex-col items-center border-2 border-b-0 bg-stroke/50 pt-1 ${height} ${you ? 'border-accent' : 'border-secondary/60'}`}>
        <span className={`h-1 w-full ${you ? 'bg-accent' : 'bg-secondary'}`} aria-hidden="true" />
        <img src={MEDALS[entry.position - 1]} alt={`${entry.position}º`} className="mt-2 size-8 pixelated lg:[@media(max-height:940px)]:mt-1 lg:[@media(max-height:940px)]:size-4" />
      </div>
    </div>
  );
}

function ManageButton({ entry, open, onToggle }: { entry: RankingEntryDto; open: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(entry.userId)}
      aria-label={`Gerenciar ${entry.displayName}`}
      aria-expanded={open}
      className="shrink-0 px-1 font-pixel text-2xl leading-none text-project hover:brightness-125"
    >
      ⋯
    </button>
  );
}

function MiniAgent({ look }: { look: AgentLook | null }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center">
      {look ? <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={2} /> : <span className="font-pixel text-xl text-muted">?</span>}
    </span>
  );
}
