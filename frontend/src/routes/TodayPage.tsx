import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ActivityType, AnswerMode, ActivityStatus, DailyAccessMode, type DailyStateDto, type CompleteDailyResult } from '../api/types';
import { ActivityScreen, Centered } from '../components/Layout';
import { OptionsAnswer } from '../components/OptionsAnswer';
import { ClozeFreeTextActivity } from '../components/ClozeFreeTextActivity';
import { RoleplayActivity } from '../components/RoleplayActivity';
import { VoiceSummaryActivity } from '../components/VoiceSummaryActivity';
import { CompletionSummary } from '../components/CompletionSummary';

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
    const allAnswered = group.every((a) => a.status === ActivityStatus.Completed);

    return (
      <ActivityScreen eyebrow="Associe os termos" title="Escolha a definição certa para cada termo.">
        <div className="flex flex-col gap-8">
          {group.map((activity) => (
            <div key={activity.id}>
              <h2 className="mb-3 text-lg font-semibold text-primary">{activity.prompt}</h2>
              <OptionsAnswer dailyId={daily.id} activity={activity} onDailyRefetched={setDaily} />
            </div>
          ))}
        </div>

        {allAnswered && (
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-xl border border-surface-alt bg-surface px-4 py-3 font-semibold text-primary hover:border-accent"
          >
            Continuar
          </button>
        )}
      </ActivityScreen>
    );
  }

  const activity = daily.activities.find((a) => a.id === step.activityId);
  if (!activity) {
    // Nao deveria acontecer (Step so aponta pra atividades que existiam em `daily` no momento em
    // que foi resolvido) - defensivo, forca reavaliar o passo com os dados atuais.
    handleContinue();
    return null;
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

  // Quiz e Cloze/MultipleChoice: mesma mecanica de OptionsAnswer, so muda o rotulo.
  return (
    <ActivityScreen
      key={activity.id}
      eyebrow={activity.type === ActivityType.Quiz ? 'Quiz do dia' : 'Complete a frase'}
      title={activity.prompt ?? ''}
    >
      <OptionsAnswer dailyId={daily.id} activity={activity} onDailyRefetched={setDaily} onContinue={handleContinue} />
    </ActivityScreen>
  );
}
