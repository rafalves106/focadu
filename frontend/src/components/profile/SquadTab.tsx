import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { RankingEntryDto, RankingScope, SquadRankingResultDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { Centered } from '../Layout';
import { ApiErrorScreen } from '../errors/ApiErrorScreen';
import { RankingScopeTabs } from '../ranking/RankingScopeTabs';
import { RankingTable } from '../ranking/RankingTable';
import { CurrentUserRankingCard } from '../ranking/CurrentUserRankingCard';

const INPUT_CLASS = 'font-display rounded-xl border-[1.5px] border-surface-alt bg-surface p-4 text-[15px] text-primary outline-none focus:border-accent';
const BUTTON_CLASS = 'font-display rounded-xl bg-accent p-4 text-sm font-bold tracking-[1px] text-base uppercase disabled:opacity-50';

/**
 * Aba "Squad" do Perfil (Fase 24) - criar/entrar por código + ranking dos membros do próprio
 * squad. Reaproveita RankingScopeTabs/RankingTable/CurrentUserRankingCard (Fase 16) direto, mesmo
 * formato de classificação - só a fonte dos membros muda (squad em vez do Course inteiro).
 * "squad_nao_encontrado" (404 de GET /api/squads/me/ranking) é tratado como estado vazio "você
 * ainda não tem squad", não como erro - mesmo padrão de StartDashboard com
 * `nenhuma_matricula_ativa`/EmptyStateStartPage.
 */
export function SquadTab() {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScope>('course');
  const { data, error, loading, retry } = useApiResource(() => api.getSquadRanking(scope), [scope]);

  if (loading) return <Centered text="Carregando squad..." />;
  if (error?.code === 'squad_nao_encontrado') return <NoSquadView onDone={retry} />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data || !user) return null;

  const isOwner = data.ownerUserId === user.id;

  return (
    <div className="flex flex-col gap-6">
      <SquadHeader data={data} userId={user.id} onLeft={retry} />
      <RankingScopeTabs scope={scope} onChange={setScope} />

      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl border border-stroke bg-surface p-4 text-sm text-secondary">
        <span>
          Score total: <strong className="font-mono text-primary">{data.totalScore.toFixed(1)}</strong>
        </span>
        <span>
          Score médio: <strong className="font-mono text-primary">{data.averageScore.toFixed(1)}</strong>
        </span>
        <span>
          Gems total: <strong className="font-mono text-primary">{data.totalGems}</strong>
        </span>
        <span>
          Gems médio: <strong className="font-mono text-primary">{data.averageGems.toFixed(1)}</strong>
        </span>
      </div>

      <CurrentUserRankingCard entry={data.currentUserEntry} />
      <RankingTable entries={data.members} highlightUserId={user.id} />

      {isOwner && <MemberManagement members={data.members} ownerUserId={data.ownerUserId} onChanged={retry} />}
    </div>
  );
}

/** Nome + código de entrada (copiar) + sair do squad. */
function SquadHeader({ data, userId, onLeft }: { data: SquadRankingResultDto; userId: string; onLeft: () => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(data.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponivel - so nao copia, mesmo tratamento de ReferralCard.
    }
  }

  async function handleLeave() {
    setError(null);
    setLeaving(true);
    try {
      await api.leaveSquad(userId);
      onLeft();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível sair do squad.');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stroke bg-surface p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="truncate text-lg font-bold text-primary">{data.squadName}</p>
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="shrink-0 text-xs font-semibold text-alert underline disabled:opacity-50"
        >
          {leaving ? 'SAINDO...' : 'SAIR DO SQUAD'}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Código de entrada</p>
        <p className="font-mono text-lg font-bold tracking-[0.3em] text-accent">{data.joinCode}</p>
        <button type="button" onClick={handleCopy} className="text-xs font-semibold text-accent underline">
          {copied ? 'COPIADO ✓' : 'COPIAR'}
        </button>
      </div>
      {error && <p className="text-sm text-alert">{error}</p>}
    </div>
  );
}

/** So o Owner ve isso - remover qualquer membro (exceto a si mesmo, ele sai pelo botão acima). */
function MemberManagement({ members, ownerUserId, onChanged }: { members: RankingEntryDto[]; ownerUserId: string; onChanged: () => void }) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const removable = members.filter((m) => m.userId !== ownerUserId);

  if (removable.length === 0) return null;

  async function handleRemove(userId: string) {
    setError(null);
    setBusyUserId(userId);
    try {
      await api.removeSquadMember(userId);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover este membro.');
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-stroke bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gerenciar membros</p>
      {error && <p className="text-sm text-alert">{error}</p>}
      {removable.map((m) => (
        <div key={m.userId} className="flex items-center justify-between gap-4">
          <span className="truncate text-sm text-primary">{m.displayName}</span>
          <button
            type="button"
            onClick={() => handleRemove(m.userId)}
            disabled={busyUserId === m.userId}
            className="shrink-0 text-xs font-semibold text-alert underline disabled:opacity-50"
          >
            {busyUserId === m.userId ? 'REMOVENDO...' : 'REMOVER'}
          </button>
        </div>
      ))}
    </div>
  );
}

/** Estado vazio "você ainda não tem squad" - criar um novo ou entrar num existente por código. */
function NoSquadView({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <CreateSquadForm onDone={onDone} />
      <JoinSquadForm onDone={onDone} />
    </div>
  );
}

function CreateSquadForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createSquad(name.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o squad.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 rounded-2xl border border-stroke bg-surface p-6">
      <p className="font-bold text-primary">Criar um squad</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do squad" className={INPUT_CLASS} />
      {error && <p className="text-sm text-alert">{error}</p>}
      <button type="submit" disabled={busy || !name.trim()} className={BUTTON_CLASS}>
        {busy ? 'CRIANDO...' : 'CRIAR SQUAD'}
      </button>
    </form>
  );
}

function JoinSquadForm({ onDone }: { onDone: () => void }) {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.joinSquad(joinCode.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar neste squad.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 rounded-2xl border border-stroke bg-surface p-6">
      <p className="font-bold text-primary">Entrar com código</p>
      <input
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        placeholder="Código de 8 caracteres"
        className={`${INPUT_CLASS} font-mono tracking-[0.2em] uppercase`}
      />
      {error && <p className="text-sm text-alert">{error}</p>}
      <button type="submit" disabled={busy || !joinCode.trim()} className={BUTTON_CLASS}>
        {busy ? 'ENTRANDO...' : 'ENTRAR NO SQUAD'}
      </button>
    </form>
  );
}
