import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { useSettings } from '../contexts/useSettings';
import { ActivityType, AnswerMode, ActivityStatus, DailyAccessMode, type DailyStateDto, type CompleteDailyResult, type WeeklyDetailDto } from '../api/types';
import { classifyApiError, type ApiFailure } from '../lib/apiError';
import { SessionContext, type SessionContextValue } from '../lib/sessionContext';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { QuizActivity } from '../components/QuizActivity';
import { WordMatchActivity } from '../components/WordMatchActivity';
import { ClozeFreeTextActivity } from '../components/ClozeFreeTextActivity';
import { RoleplayActivity } from '../components/RoleplayActivity';
import { VoiceSummaryActivity } from '../components/VoiceSummaryActivity';
import { ReadingActivity } from '../components/ReadingActivity';
import { VideoActivity } from '../components/VideoActivity';
import { CompletionSummary } from '../components/CompletionSummary';
import { ReinforcementIntroScreen } from '../components/ReinforcementIntroScreen';
import {
  BlockedTodayScreen,
  DailyRefusedScreen,
  SessionDoneScreen,
  SessionLoading,
  WeekClosureScreen,
} from '../components/session/SessionScreens';

// "Pino" do passo atual - so identifica QUAL atividade mostrar, nunca guarda uma copia dos dados
// (que vem sempre fresca de `daily.activities`) - so avancamos quando o usuario clica
// "Continuar" (ver onContinue nos componentes de atividade), pra ele sempre ver o proprio reveal
// antes de trocar de tela.
type Step = { kind: 'activity'; activityId: string } | { kind: 'done' };

/**
 * Quantas respostas cada atividade já tinha ANTES desta passada de replay começar
 * (`DailyAccessMode.Replay`, ver `Weekly.EvaluateDailyAccess`) - "Refazer este dia" reabre uma
 * Daily onde toda atividade já está `Completed` (status vem de ter QUALQUER resposta, não de uma
 * passada específica), então nem `resolveStep` nem os componentes de atividade (que decidem seu
 * proprio "já respondida" via `activity.responses.length > 0`) sabem por si só que devem pedir
 * uma resposta nova. Null fora de replay.
 */
type ReplayBaseline = Map<string, number> | null;

/** So usada pra posicionar o `step` inicial ao carregar a Daily (1a atividade ainda nao
 * concluida) - Fase 36: NAO e mais rechamada a cada "Continuar" (ver handleContinue), que agora
 * so anda 1 posicao a frente do `step` atual em vez de reavaliar "qual a 1a pendente" do zero. */
function resolveStep(daily: DailyStateDto, replayBaseline: ReplayBaseline): Step {
  const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const pending = sorted.find((a) =>
    replayBaseline ? a.responses.length <= (replayBaseline.get(a.id) ?? 0) : a.status !== ActivityStatus.Completed,
  );
  return pending ? { kind: 'activity', activityId: pending.id } : { kind: 'done' };
}

/** Modos em que "/hoje" nao tem sessao pra rodar - so um aviso (ver os dois avisos acima). */
function isSessionBlockedMode(mode: DailyAccessMode) {
  return mode === DailyAccessMode.Blocked || mode === DailyAccessMode.WeekPendingClosure;
}

/**
 * Intercepta ESC e o botao "voltar" do navegador enquanto `active` - abre o menu de configuracoes
 * (Fase 7, "menu de estilo jogo indie") em vez de deixar o usuario sair da sessao sem querer. Um
 * BrowserRouter declarativo (ver main.tsx) nao expoe useBlocker (isso so existe em cima de um data
 * router via createBrowserRouter) - o jeito padrao de segurar o botao voltar sem trocar o roteador
 * do app inteiro e empurrar uma entrada de historico "sentinela" e recusar sair dela.
 * `onIntercept` fica numa ref pra o efeito so reinstalar os listeners quando `active` muda, nunca
 * a cada render (a callback normalmente muda de identidade a cada render do componente pai).
 */
function useSessionExitGuard(active: boolean, onIntercept: () => void) {
  const onInterceptRef = useRef(onIntercept);
  onInterceptRef.current = onIntercept;

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onInterceptRef.current();
    }
    function handlePopState() {
      window.history.pushState(null, '', window.location.href);
      onInterceptRef.current();
    }

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/**
 * `/hoje` - a sessao diaria. GET /api/today resolve a Daily de hoje; `?daily=` abre outra (sessao de
 * reforco, "Refazer este dia"). Start/Resume precisam de POST /start antes de poder responder.
 *
 * Fase 68 (Figma "Daily — redesign proposto"): toda tela daqui roda dentro da casca `SessionLayout`
 * (components/SessionShell.tsx), que le deste `SessionContext` a Daily, a Weekly (buscada 1x aqui,
 * nao mais por atividade) e a etapa em tela. O conta-giros de erros saiu do menu global pro topo da
 * sessao, entao nao ha mais nada publicado pro `GlobalNav`.
 */
export function TodayPage() {
  const [searchParams] = useSearchParams();
  const overrideDailyId = searchParams.get('daily');
  const settings = useSettings();

  const [daily, setDaily] = useState<DailyStateDto | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [completion, setCompletion] = useState<CompleteDailyResult | null>(null);
  const [completing, setCompleting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [replayBaseline, setReplayBaseline] = useState<ReplayBaseline>(null);
  // Fase 15: entrada da sessao de reforco so numa sessao de reforco genuinamente nova (nenhuma
  // atividade respondida) - evita reexibir a cada reload de uma sessao ja em andamento/replay.
  const [reinforcementIntroDismissed, setReinforcementIntroDismissed] = useState(false);

  const weeklyId = daily?.weeklyId ?? null;
  const { data: weekly } = useApiResource<WeeklyDetailDto | null>(
    () => (weeklyId ? api.getWeekly(weeklyId) : Promise.resolve(null)),
    [weeklyId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setCompletion(null);
      setStep(null);

      try {
        let state = overrideDailyId ? await api.getDaily(overrideDailyId) : await api.getToday();
        if (state.accessMode === DailyAccessMode.Start || state.accessMode === DailyAccessMode.Resume) {
          state = await api.startDaily(state.id);
        }
        if (!cancelled) {
          setDaily(state);
          setReinforcementIntroDismissed(state.activities.some((a) => a.responses.length > 0));
          setReplayBaseline(
            state.accessMode === DailyAccessMode.Replay ? new Map(state.activities.map((a) => [a.id, a.responses.length])) : null,
          );
        }
      } catch (err) {
        if (!cancelled) setError(classifyApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [overrideDailyId, attempt]);

  // So decide o proximo passo quando ninguem esta "pinado" - no carregamento inicial. Nunca no meio
  // de uma atividade ja em exibicao, mesmo que `daily` mude (resposta enviada) nesse meio tempo.
  useEffect(() => {
    if (daily && step === null) setStep(resolveStep(daily, replayBaseline));
  }, [daily, step, replayBaseline]);

  // Sessao "ativa" = ha passo pra mostrar e ainda nao concluiu - nunca loading/erro, conclusao ou aviso.
  const sessionActive = daily !== null && step !== null && completion === null && !isSessionBlockedMode(daily.accessMode);
  useSessionExitGuard(sessionActive, settings.toggle);

  /**
   * Avanca pra PROXIMA atividade na ordem a partir do `step` atual - nunca recalcula "primeira nao
   * concluida" a cada Continuar (so no carregamento): voltando por "Etapa anterior" (Fase 36), o
   * aluno anda 1 etapa por vez em vez de pular direto pra onde parou.
   */
  function handleContinue() {
    if (!daily || step?.kind !== 'activity') {
      setStep(null);
      return;
    }
    const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sorted.findIndex((a) => a.id === step.activityId);
    const next = currentIndex >= 0 ? sorted[currentIndex + 1] : undefined;
    setStep(next ? { kind: 'activity', activityId: next.id } : { kind: 'done' });
  }

  /** Fase 36: revisita uma atividade ja respondida (cada componente mostra o proprio "ja respondida"). */
  function goToActivity(activityId: string) {
    setStep({ kind: 'activity', activityId });
  }

  async function handleComplete() {
    if (!daily) return;
    setCompleting(true);
    setError(null);
    try {
      const result = await api.completeDaily(daily.id);
      setCompletion(result);
      setDaily(result.daily);
    } catch (err) {
      setError(classifyApiError(err));
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <SessionLoading />;
  if (error?.status === 409) return <DailyRefusedScreen error={error} />;
  if (error) return <ApiErrorScreen error={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!daily) return null;

  const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const provide = (content: ReactNode, activityId: string | null = null, onBack?: () => void, jump?: (id: string) => void) => {
    const value: SessionContextValue = { daily, weekly: weekly ?? null, activityId, onBack, goToActivity: jump };
    return <SessionContext.Provider value={value}>{content}</SessionContext.Provider>;
  };

  if (daily.accessMode === DailyAccessMode.Blocked) return provide(<BlockedTodayScreen />);
  if (daily.accessMode === DailyAccessMode.WeekPendingClosure) return provide(<WeekClosureScreen />);
  if (!step) return null;
  if (completion) return provide(<CompletionSummary result={completion} />);
  if (daily.isReinforcement && !reinforcementIntroDismissed) {
    return provide(<ReinforcementIntroScreen onStart={() => setReinforcementIntroDismissed(true)} />);
  }

  if (step.kind === 'done') {
    const last = sorted.at(-1);
    return provide(
      <SessionDoneScreen onComplete={handleComplete} completing={completing} onReview={last ? () => goToActivity(last.id) : undefined} />,
      null,
      undefined,
      goToActivity,
    );
  }

  const rawActivity = daily.activities.find((a) => a.id === step.activityId);
  if (!rawActivity) {
    // Defensivo (Step so aponta pra atividades que existiam em `daily`) - reavalia com os dados atuais.
    setStep(null);
    return null;
  }

  // "Etapa anterior" - omitido na 1a atividade da Daily (nada pra onde voltar).
  const activityIndex = sorted.findIndex((a) => a.id === rawActivity.id);
  const previous = activityIndex > 0 ? sorted[activityIndex - 1] : null;
  const onBack = previous ? () => goToActivity(previous.id) : undefined;

  // Em replay, corta as respostas da passada anterior - senao cada atividade pularia direto pro
  // feedback antigo em vez de pedir uma resposta nova (ver ReplayBaseline).
  const baseCount = replayBaseline?.get(rawActivity.id) ?? 0;
  const activity = replayBaseline ? { ...rawActivity, responses: rawActivity.responses.slice(baseCount) } : rawActivity;
  const common = { dailyId: daily.id, activity, onDailyRefetched: setDaily, onContinue: handleContinue };

  let content: ReactNode;
  if (activity.type === ActivityType.Reading) content = <ReadingActivity {...common} />;
  else if (activity.type === ActivityType.Video) content = <VideoActivity {...common} />;
  else if (activity.type === ActivityType.WordMatch) content = <WordMatchActivity {...common} daily={daily} />;
  else if (activity.type === ActivityType.Cloze && activity.answerMode === AnswerMode.FreeText) content = <ClozeFreeTextActivity {...common} daily={daily} />;
  else if (activity.type === ActivityType.Roleplay) content = <RoleplayActivity {...common} daily={daily} />;
  else if (activity.type === ActivityType.VoiceSummary) content = <VoiceSummaryActivity {...common} daily={daily} />;
  // Quiz e Cloze/MultipleChoice: mesma mecanica de OptionsAnswer (ver QuizActivity).
  else content = <QuizActivity {...common} daily={daily} />;

  return provide(<Fragment key={activity.id}>{content}</Fragment>, activity.id, onBack, goToActivity);
}
