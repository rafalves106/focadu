import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, QuizOptionDto } from '../api/types';

/**
 * Tela de Quiz - a mais validada visualmente no Figma. Fluxo: escolher uma opcao, enviar via
 * SelectedOptionId (o Score e sempre calculado no servidor, nunca aceito pronto do cliente), e
 * mostrar o gabarito revelado (Part 1.2: so aparece depois da primeira resposta - por isso
 * buscamos a Daily de novo apos responder, ja que o proprio resultado do submit nao traz as
 * opcoes).
 */
export function QuizActivity({ dailyId, activity }: { dailyId: string; activity: DailyActivityDto }) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<QuizOptionDto[]>(activity.quizOptions);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);

  const answered = lastResponse !== null;

  async function handleSubmit() {
    if (!selectedOptionId) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitActivityResponse(dailyId, activity.id, { selectedOptionId });
      setLastResponse(result.response);

      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      if (refreshedActivity) setOptions(refreshedActivity.quizOptions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <p className="text-sm font-medium uppercase tracking-wide text-secondary">Quiz do dia</p>
      <h1 className="text-2xl font-semibold text-primary">{activity.prompt}</h1>

      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const isSelected = option.id === selectedOptionId;
          const isRevealedCorrect = answered && option.isCorrect === true;
          const isRevealedWrongPick = answered && isSelected && option.isCorrect === false;

          return (
            <button
              key={option.id}
              type="button"
              disabled={answered || submitting}
              onClick={() => setSelectedOptionId(option.id)}
              className={[
                'rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-default',
                isRevealedCorrect
                  ? 'border-accent bg-accent/10 text-accent'
                  : isRevealedWrongPick
                    ? 'border-alert bg-alert/10 text-alert'
                    : isSelected
                      ? 'border-accent bg-surface-alt text-primary'
                      : 'border-surface-alt bg-surface text-primary enabled:hover:border-secondary',
              ].join(' ')}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-alert">{error}</p>}

      {!answered && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedOptionId || submitting}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-base disabled:opacity-40"
        >
          {submitting ? 'Enviando...' : 'Responder'}
        </button>
      )}

      {answered && lastResponse && (
        <p className={`font-semibold ${lastResponse.passed ? 'text-accent' : 'text-alert'}`}>
          {lastResponse.passed ? 'Acertou! 🎉' : 'Essa não foi - confira a opção certa acima.'}
        </p>
      )}
    </div>
  );
}
