import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { ActivityType, AnswerMode, ActivityStatus, DailyAccessMode, type DailyStateDto, type CompleteDailyResult } from '../api/types';
import { classifyApiError, type ApiFailure } from '../lib/apiError';
import { ActivityScreen, Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QuizActivity } from '../components/QuizActivity';
import { WordMatchActivity } from '../components/WordMatchActivity';
import { ClozeFreeTextActivity } from '../components/ClozeFreeTextActivity';
import { RoleplayActivity } from '../components/RoleplayActivity';
import { VoiceSummaryActivity } from '../components/VoiceSummaryActivity';
import { ReadingActivity } from '../components/ReadingActivity';
import { VideoActivity } from '../components/VideoActivity';
import { CompletionSummary } from '../components/CompletionSummary';
import { ReinforcementIntroScreen } from '../components/ReinforcementIntroScreen';
import { SettingsMenu } from '../components/SettingsMenu';
import { PenaltyGauge } from '../components/gamification/PenaltyGauge';

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

function resolveStep(daily: DailyStateDto, replayBaseline: ReplayBaseline): Step {
  const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const pending = sorted.find((a) =>
    replayBaseline ? a.responses.length <= (replayBaseline.get(a.id) ?? 0) : a.status !== ActivityStatus.Completed,
  );
  return pending ? { kind: 'activity', activityId: pending.id } : { kind: 'done' };
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
 * `/hoje` (Fase 20): fora do shell `<App/>` - full-bleed, mesmo tratamento de `/onboarding`/
 * `/login`, sem o nav global sobrepondo o PenaltyGauge/botao de configuracoes (fixos no topo,
 * pensados pra ocupar o canto real da viewport - pendencia identificada na Fase 19). `<App/>`
 * so contribuia com o nav (que aqui nao deve aparecer mesmo) e o `<ErrorBoundary key={pathname}>`
 * em torno do `<Outlet/>` - reposto aqui, so que com a key incluindo `search` tambem (nao so
 * `pathname`), ja que `/hoje` navega entre Dailies diferentes via `?daily=` sem trocar de rota
 * (ver TodayPage abaixo) - sem isso, um crash nao seria "esquecido" ao trocar de Daily.
 */
export function TodayRoute() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname + location.search}>
      <TodayPage />
    </ErrorBoundary>
  );
}

/**
 * GET /api/today - a Daily ativa de hoje. Aceita um override opcional `?daily=` (nao documentado
 * como rota separada - so um parametro a mais na mesma rota `/hoje`) pra reaproveitar toda essa
 * tela ao navegar pra uma sessao de reforco recem-gerada (ver CompletionSummary), que e sempre
 * uma Daily diferente da "Daily de hoje" resolvida por /api/today.
 *
 * Start/Resume precisam de POST /start antes de poder responder (Daily.SubmitActivityResponse
 * exige Status != Locked/Available).
 */
export function TodayPage() {
  const [searchParams] = useSearchParams();
  const overrideDailyId = searchParams.get('daily');
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [daily, setDaily] = useState<DailyStateDto | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [completion, setCompletion] = useState<CompleteDailyResult | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [replayBaseline, setReplayBaseline] = useState<ReplayBaseline>(null);
  // Fase 15: gate local da ReinforcementIntroScreen - mesmo padrao de "started" das intros de
  // atividade (QuizActivity, etc), so no nivel da Daily inteira em vez de uma Activity. So mostra
  // a intro numa sessao de reforco genuinamente nova (nenhuma atividade respondida ainda) - evita
  // reexibir a cada reload de uma sessao ja em andamento/replay.
  const [reinforcementIntroDismissed, setReinforcementIntroDismissed] = useState(false);

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
            state.accessMode === DailyAccessMode.Replay
              ? new Map(state.activities.map((a) => [a.id, a.responses.length]))
              : null,
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

  // So decide o proximo passo quando ninguem esta "pinado" - ou seja, no carregamento inicial e
  // depois que o usuario clica "Continuar" (ver handleContinue). Nunca no meio de uma atividade
  // ja em exibicao, mesmo que `daily` mude (resposta enviada) nesse meio tempo.
  useEffect(() => {
    if (daily && step === null) setStep(resolveStep(daily, replayBaseline));
  }, [daily, step, replayBaseline]);

  // Sessao "ativa" = ja temos passo pra mostrar e ainda nao concluiu - cobre as telas de
  // atividade e o "done", mas nunca o loading/erro nem a CompletionSummary.
  const sessionActive = daily !== null && step !== null && completion === null;
  useSessionExitGuard(sessionActive, () => setShowSettings((prev) => !prev));

  function handleContinue() {
    setStep(null);
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

  if (loading) return <Centered text="Carregando..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!daily || !step) return null;
  if (completion) return <CompletionSummary result={completion} />;
  if (daily.isReinforcement && !reinforcementIntroDismissed) {
    return <ReinforcementIntroScreen onStart={() => setReinforcementIntroDismissed(true)} />;
  }

  return (
    <>
      {renderStep()}
      <div className="fixed left-6 top-6 z-40">
        <PenaltyGauge penaltyPoints={daily.penaltyPoints} penaltyThreshold={daily.penaltyThreshold} />
      </div>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        aria-label="Configurações"
        className="fixed right-6 top-6 z-40 flex size-9 items-center justify-center rounded-full border border-surface-alt bg-surface text-secondary hover:border-accent hover:text-primary"
      >
        ⚙
      </button>
      <SettingsMenu
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onExit={() => {
          window.location.href = '/start';
        }}
        onLogout={() => {
          void logout().then(() => navigate('/login'));
        }}
      />
    </>
  );

  function renderStep() {
    if (!daily || !step) return null;

    if (step.kind === 'done') {
      return (
        <ActivityScreen eyebrow="Quase lá" title="Você respondeu tudo por hoje.">
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className="rounded-xl bg-accent px-4 py-3 font-semibold text-base disabled:opacity-40"
          >
            {completing ? 'Concluindo...' : 'Concluir sessão'}
          </button>
        </ActivityScreen>
      );
    }

    const rawActivity = daily.activities.find((a) => a.id === step.activityId);
    if (!rawActivity) {
      // Nao deveria acontecer (Step so aponta pra atividades que existiam em `daily` no momento em
      // que foi resolvido) - defensivo, forca reavaliar o passo com os dados atuais.
      handleContinue();
      return null;
    }

    // Em replay, corta as respostas desta passada anterior - os componentes de atividade decidem
    // seu proprio "ja respondida" via `activity.responses.length > 0`/`.at(-1)`, sem isso eles
    // pulariam direto pro feedback antigo em vez de pedir uma resposta nova (ver ReplayBaseline).
    const baseCount = replayBaseline?.get(rawActivity.id) ?? 0;
    const activity = replayBaseline ? { ...rawActivity, responses: rawActivity.responses.slice(baseCount) } : rawActivity;

    if (activity.type === ActivityType.Reading) {
      return (
        <ReadingActivity
          key={activity.id}
          dailyId={daily.id}
          daily={daily}
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    if (activity.type === ActivityType.Video) {
      return (
        <VideoActivity
          key={activity.id}
          dailyId={daily.id}
          daily={daily}
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    if (activity.type === ActivityType.WordMatch) {
      return (
        <WordMatchActivity
          key={activity.id}
          dailyId={daily.id}
          daily={daily}
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    if (activity.type === ActivityType.Cloze && activity.answerMode === AnswerMode.FreeText) {
      return (
        <ClozeFreeTextActivity
          key={activity.id}
          dailyId={daily.id}
          daily={daily}
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    if (activity.type === ActivityType.Roleplay) {
      return (
        <RoleplayActivity
          key={activity.id}
          dailyId={daily.id}
          daily={daily}
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    if (activity.type === ActivityType.VoiceSummary) {
      return (
        <VoiceSummaryActivity
          key={activity.id}
          dailyId={daily.id}
          daily={daily}
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    // Quiz e Cloze/MultipleChoice: mesma mecanica de OptionsAnswer, so muda o rotulo (ver QuizActivity).
    return (
      <QuizActivity
        key={activity.id}
        dailyId={daily.id}
        daily={daily}
        activity={activity}
        onDailyRefetched={setDaily}
        onContinue={handleContinue}
      />
    );
  }
}
