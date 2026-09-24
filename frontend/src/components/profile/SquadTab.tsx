import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { RankingEntryDto, RankingScope, SquadRankingResultDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import type { FocadaExpression } from '../../lib/focadaLines';
import { ApiErrorScreen } from '../errors/ApiErrorScreen';
import { MEDALS } from '../../lib/profileLook';
import { Section } from './InformationTab';
import squadIcon from '../../assets/pixel/nav-squad.png';
import crownIcon from '../../assets/pixel/coroa.png';
import gemIcon from '../../assets/pixel/gema.png';
import rankingIcon from '../../assets/pixel/nav-ranking.png';

export type FocadaLine = { expression: FocadaExpression; text: string };

const SCOPES: { scope: RankingScope; label: string }[] = [
  { scope: 'weekly', label: 'Semana' },
  { scope: 'monthly', label: 'Mês' },
  { scope: 'course', label: 'Curso' },
];

const INPUT_CLASS = 'w-full border-2 border-stroke bg-surface px-3 py-2.5 font-pixel text-[22px] leading-tight text-primary outline-none placeholder:text-muted focus:border-accent';
const LINK_BUTTON = 'font-pixel-label text-[8px] disabled:opacity-40';

/**
 * Aba "Squad" do Perfil (Fase 24; pixel art na Fase 70, Figma nodes 88:9271/88:11017/88:13016) -
 * criar/entrar por codigo + ranking dos membros do proprio squad. O dono gerencia os membros na
 * propria linha do ranking (antes era um cartao "Gerenciar membros" separado) e o selo LIDER aparece
 * pra todo mundo (`ownerUserId` ja vinha na API). "squad_nao_encontrado" (404 de GET
 * /api/squads/me/ranking) e o estado vazio "voce ainda nao tem squad", nao erro.
 *
 * `onSay`: a fala da Focada na coluna direita depende do squad (posicao, lideranca, sem squad).
 */
export function SquadTab({ onSay }: { onSay: (line: FocadaLine) => void }) {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScope>('course');
  const [page, setPage] = useState(1);
  const { data, error, loading, retry } = useApiResource(() => api.getSquadRanking(scope, page), [scope, page]);
  const noSquad = error?.code === 'squad_nao_encontrado';

  useEffect(() => {
    if (noSquad) onSay(NO_SQUAD_LINE);
    else if (data && user) onSay(squadLine(data, user.id));
  }, [noSquad, data, user, onSay]);

  function changeScope(next: RankingScope) {
    setScope(next);
    setPage(1); // ordem muda por recorte - pagina 2 do scope anterior nao faz sentido no novo
  }

  if (loading) return <p className="font-pixel-label text-[9px] text-secondary">Carregando squad...</p>;
  if (noSquad) return <NoSquadView onDone={retry} />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!data || !user) return null;

  const isOwner = data.ownerUserId === user.id;
  const totalPages = Math.max(1, Math.ceil(data.totalMembers / data.pageSize));

  return (
    <div className="flex flex-col gap-4">
      <SquadHeader data={data} userId={user.id} isOwner={isOwner} onLeft={retry} />

      <div className="flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.scope}
            type="button"
            onClick={() => changeScope(s.scope)}
            aria-pressed={scope === s.scope}
            className={`border-2 px-3.5 py-2 font-pixel-label text-[10px] leading-none ${
              scope === s.scope ? 'border-accent bg-surface text-accent' : 'border-stroke text-secondary hover:text-primary'
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
          <Summary value={data.totalScore.toFixed(1)} label="Score total" />
          <Summary value={data.averageScore.toFixed(1)} label="Médio" />
          <Summary value={String(data.totalGems)} label="Gems" icon={gemIcon} />
        </div>
      </div>

      <MemberTable data={data} userId={user.id} isOwner={isOwner} onChanged={retry} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className={`${LINK_BUTTON} text-accent`}>
            ‹ Anterior
          </button>
          <span className="font-pixel-label text-[8px] text-secondary">
            Página {data.page} de {totalPages} · {data.totalMembers} membros
          </span>
          <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className={`${LINK_BUTTON} text-accent`}>
            Próxima ›
          </button>
        </div>
      )}
    </div>
  );
}

const NO_SQUAD_LINE: FocadaLine = {
  expression: 'acolhedora',
  text: 'Estudar junto segura a streak. Cria um squad e manda o código pra galera, ou entra num com o código de alguém.',
};

function squadLine(data: SquadRankingResultDto, userId: string): FocadaLine {
  if (data.ownerUserId === userId) {
    return data.coLeaderDisplayName
      ? { expression: 'neutra', text: `Você lidera, e ${data.coLeaderDisplayName} é seu co-líder: se você sair, é quem assume o squad.` }
      : { expression: 'neutra', text: 'Você lidera. Promova um co-líder: se você sair, é ele quem assume o squad.' };
  }
  const me = data.currentUserEntry;
  if (!me) return { expression: 'neutra', text: 'Esse é o seu squad. Cada Daily sua soma no score de todo mundo.' };
  if (me.position === 1) return { expression: 'comemorando', text: 'Você tá no topo do squad. Segura essa posição.' };
  const ahead = data.members.find((m) => m.position === me.position - 1);
  if (!ahead) return { expression: 'acolhedora', text: `Você é o ${me.position}º do squad. Uma Daily bem feita por dia e você sobe.` };
  const diff = (ahead.score - me.score).toFixed(1).replace('.', ',');
  return { expression: 'acolhedora', text: `Você é o ${me.position}º do squad. ${ahead.displayName} tá ${diff} pontos na frente, uma Daily bem feita encurta isso.` };
}

function Summary({ value, label, icon }: { value: string; label: string; icon?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon && <img src={icon} alt="" className="size-4 pixelated" />}
      <span className="font-pixel text-[22px] leading-none text-primary">{value}</span>
      <span className="font-pixel-label text-[7px] text-secondary">{label}</span>
    </span>
  );
}

/** Nome + codigo de entrada (copiar) + co-lider + sair do squad. */
function SquadHeader({ data, userId, isOwner, onLeft }: { data: SquadRankingResultDto; userId: string; isOwner: boolean; onLeft: () => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(data.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponivel - so nao copia, mesmo tratamento do ReferralPanel.
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
    <div className="flex flex-col gap-2 border-2 border-stroke bg-surface px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center border-2 border-accent/60 bg-base">
          <img src={squadIcon} alt="" className="size-8 pixelated" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className={`font-pixel-label text-[8px] ${isOwner ? 'text-project' : 'text-secondary'}`}>
            {isOwner ? 'Squad · você é o líder' : `Squad · ${data.totalMembers} ${data.totalMembers === 1 ? 'membro' : 'membros'}`}
          </p>
          <p className="truncate font-pixel text-3xl leading-none text-primary">{data.squadName}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-pixel-label text-[8px] text-secondary">Código</span>
            <span className="border-2 border-stroke bg-base px-2 font-pixel text-[22px] leading-tight tracking-[3px] text-accent">{data.joinCode}</span>
            <button type="button" onClick={handleCopy} className="font-pixel-label text-[9px] text-accent hover:underline">
              {copied ? 'Copiado ✓' : 'Copiar'}
            </button>
            {data.coLeaderDisplayName && (
              <span className="flex items-center gap-1.5 font-pixel-label text-[8px] text-project">
                <img src={crownIcon} alt="" className="size-4 pixelated" />
                Co-líder · {data.coLeaderDisplayName}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          disabled={leaving}
          className="shrink-0 border-2 border-alert/70 px-3.5 py-2.5 font-pixel-label text-[9px] leading-none text-alert hover:bg-alert/10 disabled:opacity-50"
        >
          {leaving ? 'Saindo...' : 'Sair do squad'}
        </button>
      </div>
      {error && <p className="font-pixel text-lg text-alert">{error}</p>}
    </div>
  );
}

/**
 * Ranking do squad - medalhas no top 3, a linha do aluno em verde. O dono ve as acoes na linha de
 * cada membro: remover qualquer um (menos a si mesmo, ele sai pelo botao do cabecalho) e
 * promover/rebaixar o co-lider (Fase 24b) - quem herda a lideranca se o dono sair, ver
 * LeaveSquadUseCase. `members` e a pagina exibida (Fase 24c): squad grande exige trocar de pagina pra
 * alcancar quem nao esta na 1a, mesmo trade-off documentado em GetSquadRankingUseCase.
 */
function MemberTable({ data, userId, isOwner, onChanged }: { data: SquadRankingResultDto; userId: string; isOwner: boolean; onChanged: () => void }) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(targetId: string, action: () => Promise<void>, failMessage: string) {
    setError(null);
    setBusyUserId(targetId);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failMessage);
    } finally {
      setBusyUserId(null);
    }
  }

  const promote = (m: RankingEntryDto) => run(m.userId, () => api.promoteSquadCoLeader(m.userId), 'Não foi possível promover este membro.');
  const demote = (m: RankingEntryDto) => run(m.userId, () => api.clearSquadCoLeader(), 'Não foi possível rebaixar o co-líder.');
  const remove = (m: RankingEntryDto) => run(m.userId, () => api.removeSquadMember(m.userId), 'Não foi possível remover este membro.');

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="font-pixel text-lg text-alert">{error}</p>}
      <div className="flex gap-3 px-3 font-pixel-label text-[8px] text-muted" aria-hidden="true">
        <span className="w-8">#</span>
        <span className="flex-1">Agente</span>
        <span className="w-16 text-right">Score</span>
        {isOwner && <span className="hidden w-48 text-right sm:block">Ações do líder</span>}
      </div>
      <ol className="flex flex-col gap-1">
        {data.members.map((m) => {
          const me = m.userId === userId;
          const owner = m.userId === data.ownerUserId;
          const coLeader = m.userId === data.coLeaderUserId;
          const busy = busyUserId === m.userId;
          return (
            <li
              key={m.userId}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-2 px-3 py-1.5 ${me ? 'border-accent bg-surface' : 'border-stroke'}`}
            >
              <span className="flex w-8 items-center">
                {m.position <= 3 ? (
                  <img src={MEDALS[m.position - 1]} alt={`${m.position}º`} className="size-4 pixelated" />
                ) : (
                  <span className="font-pixel text-[22px] leading-none text-secondary">{m.position}</span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className={`truncate font-pixel text-[22px] leading-tight ${me ? 'text-accent' : 'text-primary'}`}>{m.displayName}</span>
                {coLeader && (
                  <>
                    <img src={crownIcon} alt="" className="size-4 pixelated" />
                    <span className="font-pixel-label text-[7px] text-project">Co-líder</span>
                  </>
                )}
                {owner && <span className="font-pixel-label text-[7px] text-project">Líder</span>}
                {me && <span className="font-pixel-label text-[7px] text-accent">Você</span>}
              </span>
              <span className={`w-16 text-right font-pixel text-[22px] leading-tight ${me ? 'text-accent' : 'text-primary'}`}>{m.score.toFixed(1)}</span>
              {isOwner && (
                <span className="flex w-full justify-end gap-3 sm:w-48">
                  {owner ? (
                    <span className="font-pixel-label text-[7px] text-muted">Sai pelo botão acima</span>
                  ) : (
                    <>
                      <button type="button" disabled={busy} onClick={() => (coLeader ? demote(m) : promote(m))} className={`${LINK_BUTTON} text-accent hover:underline`}>
                        {busy ? '...' : coLeader ? 'Rebaixar' : 'Tornar co-líder'}
                      </button>
                      <button type="button" disabled={busy} onClick={() => remove(m)} className={`${LINK_BUTTON} text-alert hover:underline`}>
                        {busy ? '...' : 'Remover'}
                      </button>
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Estado vazio "voce ainda nao tem squad" - criar um novo ou entrar num existente por codigo. */
function NoSquadView({ onDone }: { onDone: () => void }) {
  return (
    <Section title="Você ainda não tem squad">
      <p className="font-pixel text-xl leading-tight text-secondary">
        Squad é um grupo pequeno com ranking próprio: cada membro vê o score de todo mundo, por semana, mês ou curso.
      </p>
      <div className="flex flex-col gap-4 md:flex-row">
        <SquadForm
          title="Criar um squad"
          placeholder="Nome do squad"
          submitLabel="Criar squad ›"
          busyLabel="Criando..."
          failMessage="Não foi possível criar o squad."
          primary
          onSubmit={(value) => api.createSquad(value)}
          onDone={onDone}
        />
        <SquadForm
          title="Entrar com código"
          placeholder="Ex: X9K2P7QD"
          submitLabel="Entrar no squad ›"
          busyLabel="Entrando..."
          failMessage="Não foi possível entrar neste squad."
          code
          onSubmit={(value) => api.joinSquad(value)}
          onDone={onDone}
        />
      </div>
      <div className="flex items-center gap-3.5 border-2 border-stroke bg-surface px-4 py-3.5">
        <img src={rankingIcon} alt="" className="size-8 shrink-0 pixelated" />
        <div className="flex flex-col gap-1">
          <p className="font-pixel-label text-[11px] text-primary">O código aparece aqui depois de criar</p>
          <p className="text-[13px] text-secondary">Quem cria vira líder e pode promover um co-líder.</p>
        </div>
      </div>
    </Section>
  );
}

function SquadForm({
  title,
  placeholder,
  submitLabel,
  busyLabel,
  failMessage,
  primary = false,
  code = false,
  onSubmit,
  onDone,
}: {
  title: string;
  placeholder: string;
  submitLabel: string;
  busyLabel: string;
  failMessage: string;
  primary?: boolean;
  code?: boolean;
  onSubmit: (value: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(value.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-1 flex-col gap-3.5 border-2 p-[18px] ${primary ? 'border-accent' : 'border-secondary'}`}>
      <p className={`font-pixel-label text-[9px] ${primary ? 'text-accent' : 'text-secondary'}`}>// {title}</p>
      <input
        value={value}
        onChange={(e) => setValue(code ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={placeholder}
        aria-label={title}
        className={`${INPUT_CLASS} ${code ? 'tracking-[3px] uppercase' : ''}`}
      />
      {error && <p className="font-pixel text-lg text-alert">{error}</p>}
      <button
        type="submit"
        disabled={busy || !value.trim()}
        className={`border-2 px-4 py-3.5 font-pixel-label text-[11px] leading-none disabled:opacity-40 ${
          primary ? 'border-accent bg-accent text-base hover:brightness-110' : 'border-accent text-accent hover:bg-accent/10'
        }`}
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
