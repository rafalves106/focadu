import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto, QuizOptionDto } from '../api/types';
import { FeedbackPanel } from './FeedbackPanel';

/**
 * Nucleo reutilizavel de "escolher uma opcao": usado por Quiz, cada termo de WordMatch (ver
 * TodayPage), e Cloze/MultipleChoice - mecanicamente identico nos 3 casos (SelectedOptionId,
 * Score sempre calculado no servidor a partir de QuizOption.IsCorrect). Sem shell/heading
 * proprios de proposito - quem chama decide o layout ao redor (tela cheia vs. linha de grupo).
 */
export function OptionsAnswer({
  dailyId,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  /** Se informado, mostra um botao "Continuar" apos o reveal (uso standalone: Quiz, Cloze/MultipleChoice). Omitido dentro do WordMatchGroup, que tem seu proprio botao combinado. */
  onContinue?: () => void;
}) {
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

      // Depois de responder, o gabarito e revelado - busca o estado atualizado da Daily pra
      // pegar QuizOptions[].IsCorrect preenchido (o resultado do submit nao devolve as opcoes).
      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      if (refreshedActivity) setOptions(refreshedActivity.quizOptions);
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
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
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          headline={{ pass: 'Acertou! 🎉', fail: 'Essa não foi - confira a opção certa acima.' }}
          onContinue={onContinue}
        />
      )}
    </div>
  );
}
