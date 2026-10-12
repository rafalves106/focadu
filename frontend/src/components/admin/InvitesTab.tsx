import { useState } from 'react';
import { adminApi } from '../../api/admin';
import type { AdminInviteDto, AdminInvitesDto, InviteStatus } from '../../api/adminTypes';
import { ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { dateBr } from '../../lib/adminFormat';
import { PixelConfirmDialog } from '../PixelConfirmDialog';
import { AdminPanel, Chip, EmptyPanel, Field, PanelError, PixelButton, ResultBanner, SkeletonRows } from './AdminUi';
import { inputClass } from '../../lib/adminStyles';
import { AdminShell } from './AdminShell';

// Fase 94, PG 10-19 — Convites: lista por status, criar (gaveta, 1-20 usos e 1-30 dias) e revogar.

const STATUS_FILTERS: { key: InviteStatus | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ativo', label: 'Ativos' },
  { key: 'esgotado', label: 'Esgotados' },
  { key: 'vencido', label: 'Vencidos' },
  { key: 'revogado', label: 'Revogados' },
];

const STATUS_TONE = { ativo: 'accent', esgotado: 'muted', vencido: 'amber', revogado: 'alert' } as const;

function fullLink(invite: AdminInviteDto) {
  return `${window.location.origin}${invite.link}`;
}

export function InvitesTab() {
  const { data, error, loading, retry } = useApiResource(() => adminApi.getInvites(), []);
  const [filter, setFilter] = useState<InviteStatus | 'todos'>('todos');
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<AdminInviteDto | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const invites = data?.invites ?? [];
  const shown = filter === 'todos' ? invites : invites.filter((i) => i.status === filter);
  const count = (key: InviteStatus | 'todos') => (key === 'todos' ? invites.length : invites.filter((i) => i.status === key).length);

  async function copy(invite: AdminInviteDto) {
    await navigator.clipboard.writeText(fullLink(invite)).catch(() => undefined);
    setCopied(invite.code);
    window.setTimeout(() => setCopied((c) => (c === invite.code ? null : c)), 1500);
  }

  async function revoke(invite: AdminInviteDto) {
    setRevoking(null);
    try {
      await adminApi.revokeInvite(invite.code);
      setBanner({ tone: 'success', text: `Convite ${invite.code} revogado. Quem tiver o link não consegue mais se cadastrar.` });
      retry();
    } catch (err) {
      setBanner({ tone: 'error', text: err instanceof ApiError ? err.message : 'Não deu pra revogar. Tente de novo.' });
    }
  }

  return (
    <AdminShell
      section="Convites"
      subtitle="Cada convite é um código de 8 caracteres. Quem tem o link cria conta e confirma o e-mail; sem convite, ninguém entra."
    >
      <div className="flex flex-wrap items-center justify-between gap-3 lg:shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-pixel-label text-[7px] text-secondary">STATUS</span>
          {STATUS_FILTERS.map((f) => (
            <PixelButton key={f.key} tone={filter === f.key ? 'selected' : 'outline'} onClick={() => setFilter(f.key)}>
              {f.label} · {count(f.key)}
            </PixelButton>
          ))}
        </div>
        <PixelButton tone="primary" onClick={() => setCreating(true)} disabled={!data}>
          + Criar convite
        </PixelButton>
      </div>

      {banner && (
        <ResultBanner tone={banner.tone} onClose={() => setBanner(null)}>
          {banner.text}
        </ResultBanner>
      )}
      {loading && !data && <SkeletonRows rows={6} />}
      {error && <PanelError message="Não deu pra carregar os convites." code="ADMIN_INVITES_FAILED" onRetry={retry} />}
      {data && invites.length === 0 && (
        <EmptyPanel title="Nenhum convite ainda">Crie o primeiro convite e mande o link pra quem vai testar.</EmptyPanel>
      )}
      {data && invites.length > 0 && (
        <AdminPanel
          label="Convites"
          context={`${invites.length} convites · ${invites.reduce((s, i) => s + i.usedCount, 0)} cadastros feitos com eles · mais novos primeiro`}
          className="lg:flex-1 lg:overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-base">
                <tr className="border-b-2 border-stroke font-pixel-label text-[7px] text-secondary">
                  <th className="px-3 py-2 font-normal">CÓDIGO</th>
                  <th className="px-3 py-2 font-normal">PRA QUEM</th>
                  <th className="px-3 py-2 font-normal">USOS</th>
                  <th className="px-3 py-2 font-normal">VALIDADE</th>
                  <th className="px-3 py-2 font-normal">STATUS</th>
                  <th className="px-3 py-2 text-right font-normal">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((invite) => (
                  <tr key={invite.code} className="border-b border-stroke text-[13px] hover:bg-surface">
                    <td className="px-3 py-3 font-pixel-label text-[10px] text-primary">{invite.code}</td>
                    <td className="px-3 py-3 text-primary">{invite.note}</td>
                    <td className="px-3 py-3 font-pixel-label text-[9px] text-primary">
                      {invite.usedCount} / {invite.maxUses}
                    </td>
                    <td className="px-3 py-3 text-secondary">{validity(invite)}</td>
                    <td className="px-3 py-3">
                      <Chip tone={STATUS_TONE[invite.status]}>{invite.status.toUpperCase()}</Chip>
                    </td>
                    <td className="px-3 py-3">
                      {invite.status === 'ativo' && (
                        <div className="flex justify-end gap-2">
                          <PixelButton size="sm" onClick={() => copy(invite)}>
                            {copied === invite.code ? 'Copiado' : 'Copiar link'}
                          </PixelButton>
                          <PixelButton size="sm" tone="danger" onClick={() => setRevoking(invite)}>
                            Revogar
                          </PixelButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-secondary">
            Link de cadastro: {window.location.host}/login?convite=CÓDIGO · esgotado, vencido e revogado ficam na lista pra histórico
          </p>
        </AdminPanel>
      )}

      {creating && data && (
        <CreateInviteDrawer
          limits={data}
          onClose={() => setCreating(false)}
          onCreated={() => retry()}
        />
      )}

      <PixelConfirmDialog
        open={revoking !== null}
        message={revoking ? `Revogar o convite ${revoking.code} (${revoking.note})? Quem já entrou continua; o link para de funcionar.` : ''}
        confirmLabel="Revogar"
        cancelLabel="Cancelar"
        onConfirm={() => revoking && revoke(revoking)}
        onCancel={() => setRevoking(null)}
      />
    </AdminShell>
  );
}

function validity(invite: AdminInviteDto) {
  if (invite.status === 'revogado') return `revogado em ${dateBr(invite.revokedAt)}`;
  if (!invite.expiresAt) return 'não vence';
  return invite.status === 'vencido' ? `venceu em ${dateBr(invite.expiresAt)}` : `até ${dateBr(invite.expiresAt)}`;
}

function CreateInviteDrawer({ limits, onClose, onCreated }: { limits: AdminInvitesDto; onClose: () => void; onCreated: () => void }) {
  const [note, setNote] = useState('');
  const [uses, setUses] = useState('1');
  const [days, setDays] = useState(String(limits.defaultValidDays));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [created, setCreated] = useState<AdminInviteDto | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const usesNumber = Number(uses);
  const daysNumber = Number(days);
  const usesError = !Number.isInteger(usesNumber) || uses === '' ? 'Use um número inteiro.'
    : usesNumber < 1 ? 'Pelo menos 1 uso.'
    : usesNumber > limits.maxUsesLimit ? `No máximo ${limits.maxUsesLimit} usos.` : null;
  const daysError = !Number.isInteger(daysNumber) || days === '' ? 'Use um número inteiro.'
    : daysNumber < 1 ? 'Pelo menos 1 dia.'
    : daysNumber > limits.maxValidDays ? `No máximo ${limits.maxValidDays} dias.` : null;
  const expires = new Date();
  expires.setDate(expires.getDate() + (daysError ? 0 : daysNumber));

  async function create() {
    setBusy(true);
    setFailure(null);
    try {
      setCreated(await adminApi.createInvite(note.trim(), usesNumber, daysNumber));
      onCreated();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : 'Não deu pra criar o convite. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(what: 'code' | 'link', text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(what);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-base/70 backdrop-blur-sm" role="presentation" onClick={busy ? undefined : onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Criar convite"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto border-l-2 border-accent bg-base p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-pixel-label text-[10px] text-accent">// {created ? 'CONVITE CRIADO' : 'CRIAR CONVITE'}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className="flex size-9 items-center justify-center border-2 border-stroke text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        {created ? (
          <>
            <p className="text-[14px] text-primary">
              Mande o código ou o link pra {created.note}. Vale {created.maxUses} {created.maxUses === 1 ? 'cadastro' : 'cadastros'} até {dateBr(created.expiresAt)}.
            </p>
            <div className="flex items-center justify-between gap-3 border-2 border-accent px-4 py-4">
              <span className="font-pixel-label text-[22px] text-accent">{created.code}</span>
              <PixelButton size="sm" onClick={() => copy('code', created.code)}>
                {copied === 'code' ? 'Copiado' : 'Copiar código'}
              </PixelButton>
            </div>
            <div className="flex items-center justify-between gap-3 border-2 border-stroke px-4 py-3">
              <span className="truncate font-mono text-[12px] text-secondary">{fullLink(created)}</span>
              <PixelButton size="sm" onClick={() => copy('link', fullLink(created))}>
                {copied === 'link' ? 'Copiado' : 'Copiar link'}
              </PixelButton>
            </div>
            <PixelButton tone="primary" onClick={onClose}>
              Pronto
            </PixelButton>
          </>
        ) : (
          <>
            <p className="text-[13px] text-secondary">O convite sempre vence. Quem já entrou continua, mesmo depois que ele vence.</p>
            <Field label="PRA QUEM" help="Anotação livre: o nome da pessoa ou da turma.">
              <input className={inputClass()} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Turma da faculdade" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="USOS" help={`de 1 a ${limits.maxUsesLimit} · padrão 1`} error={usesError}>
                <input className={inputClass(Boolean(usesError))} inputMode="numeric" value={uses} onChange={(e) => setUses(e.target.value)} />
              </Field>
              <Field label="VALE POR (DIAS)" help={`de 1 a ${limits.maxValidDays} · padrão ${limits.defaultValidDays} · vence em ${expires.toLocaleDateString('pt-BR')}`} error={daysError}>
                <input className={inputClass(Boolean(daysError))} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
              </Field>
            </div>
            {failure && <p className="border-2 border-alert px-3 py-2 text-[13px] text-alert">{failure}</p>}
            <div className="flex justify-end gap-2">
              <PixelButton onClick={onClose} disabled={busy}>
                Cancelar
              </PixelButton>
              <PixelButton tone="primary" onClick={create} disabled={busy || !note.trim() || Boolean(usesError) || Boolean(daysError)}>
                {busy ? 'Criando…' : 'Criar convite'}
              </PixelButton>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
