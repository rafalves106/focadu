import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ActivityType, AnswerMode, ActivityStatus, DailyAccessMode, type DailyStateDto, type CompleteDailyResult } from '../api/types';
import { ActivityScreen, Centered } from '../components/Layout';
import { QuizActivity } from '../components/QuizActivity';
import { WordMatchActivity } from '../components/WordMatchActivity';
import { ClozeFreeTextActivity } from '../components/ClozeFreeTextActivity';
import { RoleplayActivity } from '../components/RoleplayActivity';
import { VoiceSummaryActivity } from '../components/VoiceSummaryActivity';
import { ReadingActivity } from '../components/ReadingActivity';
import { VideoActivity } from '../components/VideoActivity';
import { CompletionSummary } from '../components/CompletionSummary';
import { SettingsMenu } from '../components/SettingsMenu';

// "Pino" do passo atual - so identifica QUAL atividade/grupo mostrar, nunca guarda uma copia dos
// dados (que vem sempre fresca de `daily.activities`). Isso evita 2 problemas: (1) trocar de tela
// assim que a ultima atividade e respondida, sem o usuario ver o proprio reveal - so avancamos
// quando o usuario clica "Continuar" (ver onContinue nos componentes de atividade); (2) dados
// desatualizados dentro do WordMatchGroup apos responder um dos termos.
type Step = { kind: 'activity'; activityId: string } | { kind: 'wordMatchGroup' } | { kind: 'done' };

function resolveStep(daily: DailyStateDto): Step {
  const sorted = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const pending = sorted.find((a) => a.status !== ActivityStatus.Completed);
  if (!pending) return { kind: 'done' };
  if (pending.type === ActivityType.WordMatch) return { kind: 'wordMatchGroup' };
  return { kind: 'activity', activityId: pending.id };
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

  const [daily, setDaily] = useState<DailyStateDto | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompleteDailyResult | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
        if (!cancelled) setDaily(state);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Nao foi possivel carregar a Daily.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [overrideDailyId]);

  // So decide o proximo passo quando ninguem esta "pinado" - ou seja, no carregamento inicial e
  // depois que o usuario clica "Continuar" (ver handleContinue). Nunca no meio de uma atividade
  // ja em exibicao, mesmo que `daily` mude (resposta enviada) nesse meio tempo.
  useEffect(() => {
    if (daily && step === null) setStep(resolveStep(daily));
  }, [daily, step]);

  // Sessao "ativa" = ja temos passo pra mostrar e ainda nao concluiu - cobre as telas de
  // atividade, o "done" e o wordMatchGroup, mas nunca o loading/erro nem a CompletionSummary.
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
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel concluir a sessao.');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <Centered text="Carregando..." />;
  if (error) return <Centered text={error} tone="alert" />;
  if (!daily || !step) return null;
  if (completion) return <CompletionSummary result={completion} />;

  return (
    <>
      {renderStep()}
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

    // WordMatch: todas as DailyActivity WordMatch da Daily formam, juntas, 1 exercicio de
    // associacao - 1 termo por atividade (decisao de modelagem confirmada na Fase 4, ver
    // docs/ARQUITETURA.md). Renderizadas lado a lado, cada uma pontuando independentemente; o botao
    // "Continuar" so aparece quando TODOS os termos ja tiverem resposta.
    if (step.kind === 'wordMatchGroup') {
      const group = [...daily.activities]
        .filter((a) => a.type === ActivityType.WordMatch)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      return <WordMatchActivity group={group} dailyId={daily.id} onDailyRefetched={setDaily} onContinue={handleContinue} />;
    }

    const activity = daily.activities.find((a) => a.id === step.activityId);
    if (!activity) {
      // Nao deveria acontecer (Step so aponta pra atividades que existiam em `daily` no momento em
      // que foi resolvido) - defensivo, forca reavaliar o passo com os dados atuais.
      handleContinue();
      return null;
    }

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

    if (activity.type === ActivityType.Cloze && activity.answerMode === AnswerMode.FreeText) {
      return (
        <ClozeFreeTextActivity
          key={activity.id}
          dailyId={daily.id}
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
          activity={activity}
          onDailyRefetched={setDaily}
          onContinue={handleContinue}
        />
      );
    }

    // Quiz e Cloze/MultipleChoice: mesma mecanica de OptionsAnswer, so muda o rotulo (ver QuizActivity).
    return (
      <QuizActivity key={activity.id} dailyId={daily.id} activity={activity} onDailyRefetched={setDaily} onContinue={handleContinue} />
    );
  }
}
