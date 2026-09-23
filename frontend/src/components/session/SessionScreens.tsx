import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { WeeklyProjectStatus } from '../../api/types';
import type { ApiFailure } from '../../lib/apiError';
import { BLOCKED_TODAY, SESSION_DONE_LINE } from '../../lib/focadaSessionLines';
import { useSession } from '../../lib/sessionContext';
import { useSessionKeys } from '../../lib/useSessionKeys';
import { PendingReinforcementCard } from '../PendingReinforcementCard';
import { SessionFooter, SessionLayout } from '../SessionShell';
import { FocadaSays } from './FocadaSays';
import { PixelButton, PixelLink } from './PixelButton';
import castleIcon from '../../assets/pixel/mapa/castelo-pendente.png';

/** Carregando dentro da casca global (sem `min-h-screen`, que empurraria a pagina). */
export function SessionLoading() {
  return <div className="flex flex-1 items-center justify-center p-6 font-pixel text-2xl text-secondary">Carregando...</div>;
}

function useCountdownToMidnight() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const left = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

/** Todas as etapas respondidas, falta so concluir (Enter tambem conclui). */
export function SessionDoneScreen({ onComplete, completing, onReview }: { onComplete: () => void; completing: boolean; onReview?: () => void }) {
  useSessionKeys((key) => {
    if (key === 'Enter' && !completing) onComplete();
  });
  return (
    <SessionLayout label="Tudo respondido" chain="done" centered>
      <FocadaSays expression="comemorando" size="lg" tone="accent">
        {SESSION_DONE_LINE}
      </FocadaSays>
      <SessionFooter>
        {onReview && (
          <button type="button" onClick={onReview} className="font-pixel-label text-[9px] text-secondary hover:text-primary">
            ← Revisar a última etapa
          </button>
        )}
        <PixelButton onClick={onComplete} disabled={completing}>
          {completing ? 'Concluindo...' : 'Concluir sessão ›'}
        </PixelButton>
      </SessionFooter>
    </SessionLayout>
  );
}

/**
 * `DailyAccessMode.Blocked` (Fase 37b): a cota de 1 sessao por dia ja foi gasta. Fase 68 (Figma
 * "Daily — 14"): na voz da Focada, com contagem ate a proxima sessao e o reforco pendente, que fica
 * fora da cota (Fase 55) e e a unica coisa que o aluno ainda pode fazer hoje.
 */
export function BlockedTodayScreen() {
  const { daily, weekly } = useSession();
  const countdown = useCountdownToMidnight();
  return (
    <SessionLayout label="Sessão de hoje" sub="1 por dia" showGauge={false} centered>
      <FocadaSays size="lg">{BLOCKED_TODAY}</FocadaSays>
      <div className="flex w-fit items-center gap-3 border-2 border-stroke px-4 py-2.5">
        <span className="font-pixel-label text-[9px] text-secondary">Próxima sessão em</span>
        <span className="font-pixel text-3xl leading-none text-accent tabular-nums">{countdown}</span>
      </div>
      {daily.pendingReinforcementDailyId && <PendingReinforcementCard dailyId={daily.pendingReinforcementDailyId} />}
      {weekly && (
        <SessionFooter>
          <PixelLink to={`/start?course=${weekly.courseId}&weekly=${weekly.id}`} tone="muted" ghost>
            Ver a semana
          </PixelLink>
          <PixelLink to={`/start?course=${weekly.courseId}`}>Voltar pro mapa ›</PixelLink>
        </SessionFooter>
      )}
    </SessionLayout>
  );
}

/**
 * `DailyAccessMode.WeekPendingClosure` (Fase 54): as Dailies da semana acabaram, a proxima semana so
 * abre com o projeto avaliado (e a publicacao). Pedido do dono: com o projeto pendente e nada mais a
 * fazer, "Hoje" ja leva direto pro projeto. Com reforco pendente, fica aqui pra oferecer os dois.
 */
export function WeekClosureScreen() {
  const { daily, weekly } = useSession();
  if (!weekly) return <SessionLoading />;

  const projectUrl = `/start?course=${weekly.courseId}&weekly=${weekly.id}&project=1`;
  const projectPending = !!weekly.project && weekly.project.status !== WeeklyProjectStatus.Evaluated;
  if (projectPending && !daily.pendingReinforcementDailyId) return <Navigate to={projectUrl} replace />;

  return (
    <SessionLayout tone="project" label={`Semana ${weekly.number} fechando`} sub="Dias concluídos" showGauge={false} centered>
      <FocadaSays size="lg" tone="project">
        {projectPending
          ? `Os dias da Semana ${weekly.number} estão feitos. Falta o castelo: entrega o projeto da semana e a próxima destranca.`
          : `Dias e projeto da Semana ${weekly.number} feitos! Falta validar a publicação do módulo pra próxima semana abrir.`}
      </FocadaSays>
      {projectPending && (
        <div className="flex items-center gap-4 border-2 border-project px-4 py-3">
          <img src={castleIcon} alt="" className="size-16 shrink-0 pixelated" />
          <div className="flex flex-col gap-1">
            <p className="font-pixel-label text-[10px] text-project">Projeto da Semana {weekly.number} · pendente</p>
            <p className="font-pixel text-lg leading-tight text-secondary">O repositório já está pronto no Forgejo.</p>
          </div>
        </div>
      )}
      {daily.pendingReinforcementDailyId && <PendingReinforcementCard dailyId={daily.pendingReinforcementDailyId} />}
      <SessionFooter>
        <PixelLink to={`/start?course=${weekly.courseId}&weekly=${weekly.id}`} tone="muted" ghost>
          Ver a semana
        </PixelLink>
        {projectPending ? (
          <PixelLink to={projectUrl} tone="project">
            Ir pro castelo ›
          </PixelLink>
        ) : (
          <PixelLink to={`/start?course=${weekly.courseId}&weekly=${weekly.id}`} tone="project">
            Publicar o módulo ›
          </PixelLink>
        )}
      </SessionFooter>
    </SessionLayout>
  );
}

/** Textos (com acento) das recusas ao abrir uma Daily - o backend manda sem acento, fica de fallback. */
const DAILY_REFUSAL_COPY: Record<string, string> = {
  daily_limite_diario_atingido: 'Você já fez uma sessão hoje — o limite é 1 por dia. Amanhã tem mais, agente.',
  daily_em_andamento: 'Você já tem uma sessão em andamento. Termina (ou retoma) aquela antes de começar outra.',
  projeto_semana_anterior_pendente: 'O projeto de uma semana anterior ainda não foi concluído. Entrega ele e espera a avaliação pra liberar esta semana.',
  modulo_bloqueado_por_publicacao: 'Uma semana anterior precisa de uma publicação validada antes de começar esta.',
};

/**
 * Recusa de regra de negocio (HTTP 409) ao abrir uma Daily - nao e falha do sistema, entao "tentar de
 * novo" nao ajuda: mostra o motivo real (bug real, 21/09/2026). Sem Daily carregada, entao sem casca.
 */
export function DailyRefusedScreen({ error }: { error: ApiFailure }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <p className="font-pixel-label text-[9px] text-alert">// Não dá pra abrir essa sessão agora</p>
        <FocadaSays expression="acolhedora" size="lg">
          {(error.code && DAILY_REFUSAL_COPY[error.code]) ?? error.message}
        </FocadaSays>
        <PixelLink to="/start" className="self-end">
          Voltar ao início ›
        </PixelLink>
      </div>
    </div>
  );
}
