import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { SquadJoinRequestEntryDto, SquadJoinRequestsDto } from '../../api/types';
import { lookFromDto } from '../../lib/agentSprites';
import { AgentSprite } from '../agent/AgentSprite';
import { PixelConfirmDialog } from '../PixelConfirmDialog';

const DAY_MS = 24 * 60 * 60 * 1000;

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `há ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(diff / DAY_MS);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - DAY_MS);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function expiresIn(iso: string): string | null {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
  return days <= 6 ? `vence em ${Math.max(1, days)} ${days <= 1 ? 'dia' : 'dias'}` : null;
}

function noticeText(r: SquadJoinRequestEntryDto): string {
  const by = r.decidedByMe ? 'você' : (r.decidedByName ?? 'a liderança');
  if (r.status === 'accepted') return `entrou no squad · aceito por ${by}`;
  if (r.status === 'rejected') return `teve o pedido recusado por ${by} · não pode pedir de novo`;
  return `pode pedir de novo · recusa desfeita por ${by}`;
}

function Avatar({ entry, small = false }: { entry: SquadJoinRequestEntryDto; small?: boolean }) {
  const look = lookFromDto(entry.look);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden bg-surface ${small ? 'size-10' : 'size-12'}`}>
      {look ? <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={2} /> : <span className="font-pixel text-2xl text-muted">?</span>}
    </span>
  );
}

/**
 * Aba "Notificacoes" do QG (Fase 77, Figma "Squad: pedidos de entrada — v2", 162:4503) - so pro lider e
 * o colider. Em cima os pedidos abertos (Recusar / Aceitar; recusar pede confirmacao da Focada porque
 * bane a pessoa do squad), embaixo os avisos das decisoes, com "Desfazer recusa" nos recusados.
 * `onChanged` recarrega o QG (aceitar poe gente nova na escalacao) e o contador.
 */
export function SquadRequests({ data, onChanged }: { data: SquadJoinRequestsDto; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<SquadJoinRequestEntryDto | null>(null);

  async function decide(entry: SquadJoinRequestEntryDto, action: 'accept' | 'reject' | 'undo-reject') {
    setBusyId(entry.id);
    setError(null);
    try {
      await api.decideSquadJoinRequest(entry.id, action);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não deu certo agora. Tenta de novo.');
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-pixel-label text-[8px] text-project">Pedidos pra entrar · só líder e colíder veem</p>
      {error && <p className="font-pixel text-lg text-alert">{error}</p>}
      {data.pending.length === 0 ? (
        <p className="font-pixel text-xl leading-tight text-secondary">Nenhum pedido esperando. Quem usar o código do squad aparece aqui.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.pending.map((r) => {
            const due = expiresIn(r.expiresAt);
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 border-2 border-project px-2.5 py-2">
                <Avatar entry={r} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 font-pixel-label text-[9px] text-primary">
                    <span className="truncate">{r.displayName}</span>
                    <span className="text-[8px] text-muted">
                      · {ago(r.createdAt)}
                      {due && ` · ${due}`}
                    </span>
                  </p>
                  <p className="font-pixel text-[19px] leading-[1.05] text-secondary sm:text-[21px]">quer entrar no squad pelo código de convite</p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => setConfirmReject(r)}
                    className="flex-1 border-2 border-stroke px-4 py-2.5 font-pixel-label text-[9px] text-secondary hover:text-primary disabled:opacity-40 sm:flex-none"
                  >
                    Recusar
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => decide(r, 'accept')}
                    className="flex-1 bg-accent px-5 py-2.5 font-pixel-label text-[9px] text-base hover:brightness-110 disabled:opacity-40 sm:flex-none"
                  >
                    {busyId === r.id ? '...' : 'Aceitar ›'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-2 flex items-center gap-3 font-pixel-label text-[8px] text-muted">
        Avisos
        <span className="h-0.5 flex-1 bg-stroke/60" aria-hidden="true" />
      </p>
      {data.decided.length === 0 ? (
        <p className="font-pixel text-xl leading-tight text-secondary">Nada decidido nos últimos 30 dias.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {data.decided.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-1 py-1.5">
              <Avatar entry={r} small />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate font-pixel-label text-[9px] text-primary">{r.displayName}</p>
                <p className="font-pixel text-[19px] leading-[1.05] text-secondary">{noticeText(r)}</p>
              </div>
              {r.status === 'rejected' && (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => decide(r, 'undo-reject')}
                  className="shrink-0 font-pixel-label text-[8px] text-accent hover:brightness-125 disabled:opacity-40"
                >
                  Desfazer recusa
                </button>
              )}
              {r.decidedAt && <span className="shrink-0 font-pixel-label text-[8px] text-muted">{dayLabel(r.decidedAt)}</span>}
            </li>
          ))}
        </ul>
      )}

      <PixelConfirmDialog
        open={confirmReject !== null}
        message={
          confirmReject
            ? `Recusar o pedido de ${confirmReject.displayName}? Não vai poder pedir de novo pra este squad. Se mudar de ideia, dá pra desfazer nos avisos.`
            : ''
        }
        confirmLabel="Recusar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmReject(null)}
        onConfirm={() => {
          const target = confirmReject;
          setConfirmReject(null);
          if (target) void decide(target, 'reject');
        }}
      />
    </div>
  );
}
