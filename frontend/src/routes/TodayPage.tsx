import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSettings } from '../contexts/useSettings';
import { ActivityType, AnswerMode, ActivityStatus, DailyAccessMode, type DailyStateDto, type CompleteDailyResult } from '../api/types';
import { classifyApiError, type ApiFailure } from '../lib/apiError';
import { ActivityScreen, Centered } from '../components/Layout';
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
import { setDailyPenalty } from '../lib/dailyPenaltyContext';

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
 * `/hoje` (Fase 25: voltou pra dentro do shell `<App/>`, ganhou o `GlobalNav` como todo o resto da
 * plataforma - era full-bleed desde a Fase 20 pra nao colidir com o PenaltyGauge/botao de
 * configuracoes fixos no topo). `<App/>` cuida do `<ErrorBoundary key={pathname+search}>` agora
 * (`+search` cobre `/hoje` navegando entre Dailies via `?daily=` sem trocar de rota - sem isso um
 * crash nao seria "esquecido" ao trocar de Daily).
 *
 * Fase 36: o contador de erros (antigo `PenaltyGauge` fixo `left-6 top-[72px]`, citado no
 * parágrafo acima) mudou de lugar - agora vive no `GlobalNav` (badge no header), publicado via
 * `dailyPenaltyContext` (ver useEffect logo abaixo do `resolveStep`). `SessionLayout` continua
 * com o mesmo `pt-20` de sempre (ver SessionShell.tsx) - a folga ali era pro badge fixo antigo,
 * hoje meio "orfã" mas inofensiva (só espaço vazio) e não vale reajustar o layout de toda tela de
 * sessão por causa disso sozinho.
 *
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
  const settings = useSettings();

  const [daily, setDaily] = useState<DailyStateDto | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [completion, setCompletion] = useState<CompleteDailyResult | null>(null);
  const [completing, setCompleting] = useState(false);
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

  // Fase 36: publica o contador de erros da Daily atual pro GlobalNav (ver dailyPenaltyContext) -
  // mesma janela de visibilidade que o badge fixo antigo tinha (nunca durante a CompletionSummary,
  // ver early return abaixo). Limpa ao sair da tela de qualquer jeito (completar a Daily, trocar de
  // Daily via `attempt`/`overrideDailyId`, ou desmontar), senao o badge do header ficaria preso
  // mostrando o numero de uma sessao que ja acabou.
  useEffect(() => {
    setDailyPenalty(
      daily && completion === null ? { penaltyPoints: daily.penaltyPoints, penaltyThreshold: daily.penaltyThreshold } : null,
    );
    return () => setDailyPenalty(null);
  }, [daily, completion]);

  // Sessao "ativa" = ja temos passo pra mostrar e ainda nao concluiu - cobre as telas de
  // atividade e o "done", mas nunca o loading/erro nem a CompletionSummary.
  const sessionActive = daily !== null && step !== null && completion === null;
  useSessionExitGuard(sessionActive, settings.toggle);

  /**
   * Avanca pra PROXIMA atividade na ordem (`orderIndex + 1` a partir do `step` atual) - nunca
   * mais recalcula "primeira nao concluida" (`resolveStep`) a cada Continuar, so no carregamento
   * inicial da Daily (ver useEffect acima). As duas formas davam o mesmo resultado enquanto o
   * fluxo era estritamente sequencial, mas divergiam ao voltar por "Etapa anterior" (Fase 36): re-
   * rodar `resolveStep` a partir de uma etapa ja concluida pulava direto pra etapa real em
   * andamento, em vez de so avancar 1 - descoberto numa verificacao ao vivo (usuario esperava ir
   * da Etapa 1 revisitada pra Etapa 2, nao pulava pra Etapa 4). `daily.activities` no closure
   * pode estar 1 render atrasado (a resposta acabou de ser submetida) mas isso nao importa aqui -
   * so a ORDEM/identidade das atividades e usada, nunca status/responses, e essas nao mudam.
   */
  function handleContinue() {
    if (!daily || step?.kind !== 'activity') {
      setStep(null); // defensivo - nao deveria disparar fora de um step de atividade.
      return;
    }
    const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sorted.findIndex((a) => a.id === step.activityId);
    const next = currentIndex >= 0 ? sorted[currentIndex + 1] : undefined;
    setStep(next ? { kind: 'activity', activityId: next.id } : { kind: 'done' });
  }

  /** Fase 36: pino manual num id de atividade especifico - usado por "Etapa anterior" (ver
   * renderStep abaixo). Sempre uma atividade que ja existe em `daily.activities`, entao cada
   * componente renderiza seu proprio estado "ja respondida" (via `activity.responses`) sozinho -
   * nunca reabre a atividade pra responder de novo, so revisita. "Continuar" a partir dali agora
   * so avanca 1 posicao por vez (handleContinue acima), levando de volta pra onde o aluno estava
   * andando pra frente uma etapa de cada vez, nunca pulando direto pro fim da revisao. */
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

  if (loading) return <Centered text="Carregando..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!daily || !step) return null;
  if (completion) return <CompletionSummary result={completion} />;
  if (daily.isReinforcement && !reinforcementIntroDismissed) {
    return <ReinforcementIntroScreen onStart={() => setReinforcementIntroDismissed(true)} />;
  }

  // Fase 36: o contador de erros saiu daqui (badge fixo `left-6 top-[72px]`) e foi pro header
  // (GlobalNav, via dailyPenaltyContext acima) - reportado numa verificacao ao vivo como confuso
  // ali, parecendo um contador de etapa por estar tao perto do SessionTopBar.
  return renderStep();

  function renderStep() {
    if (!daily || !step) return null;

    const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);

    if (step.kind === 'done') {
      const lastActivity = sortedActivities.at(-1);
      return (
        <ActivityScreen eyebrow="Quase lá" title="Você respondeu tudo por hoje.">
          {lastActivity && (
            <button
              type="button"
              onClick={() => goToActivity(lastActivity.id)}
              className="w-fit text-sm text-muted hover:text-primary"
            >
              &larr; Etapa anterior
            </button>
          )}
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

    // Fase 36: "Etapa anterior" - omitido na 1a atividade da Daily (nada pra onde voltar).
    const activityIndex = sortedActivities.findIndex((a) => a.id === rawActivity.id);
    const previousActivity = activityIndex > 0 ? sortedActivities[activityIndex - 1] : null;
    const onBack = previousActivity ? () => goToActivity(previousActivity.id) : undefined;

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
          onBack={onBack}
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
          onBack={onBack}
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
          onBack={onBack}
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
          onBack={onBack}
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
          onBack={onBack}
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
          onBack={onBack}
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
        onBack={onBack}
      />
    );
  }
}
