import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto, QuizOptionDto } from '../api/types';
import { useSessionKeys } from '../lib/useSessionKeys';
import { FeedbackPanel } from './FeedbackPanel';
import { OptionCard } from './activities/OptionCard';
import { SessionFooter } from './SessionShell';
import { PixelButton } from './session/PixelButton';

/**
 * Nucleo de "escolher uma opcao" - Quiz e Lacuna de multipla escolha (SelectedOptionId, Score sempre
 * calculado no servidor a partir de QuizOption.IsCorrect). Fase 68: opcoes numeradas 1-N, que tambem
 * sao as teclas (1-N escolhe, Enter confirma); o "Confirmar" e a reacao da Focada vao pro rodape fixo.
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
  onContinue: () => void;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<QuizOptionDto[]>(activity.quizOptions);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);

  const answered = lastResponse !== null;

  async function handleSubmit() {
    if (!selectedOptionId || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitActivityResponse(dailyId, activity.id, { selectedOptionId });
      // Depois de responder, o gabarito e revelado - busca o estado atualizado da Daily pra pegar
      // QuizOptions[].IsCorrect preenchido (o resultado do submit nao devolve as opcoes).
      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      if (refreshedActivity) setOptions(refreshedActivity.quizOptions);
      setLastResponse(result.response);
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  useSessionKeys((key) => {
    const n = Number(key);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) setSelectedOptionId(options[n - 1].id);
    else if (key === 'Enter') void handleSubmit();
  }, !answered);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {options.map((option, index) => {
          const isSelected = option.id === selectedOptionId;
          const state =
            answered && option.isCorrect === true
              ? 'correct'
              : answered && isSelected && option.isCorrect === false
                ? 'wrong'
                : answered
                  ? 'dimmed'
                  : isSelected
                    ? 'selected'
                    : 'neutral';
          return (
            <OptionCard
              key={option.id}
              label={String(index + 1)}
              text={option.text}
              state={state}
              disabled={answered || submitting}
              onClick={() => setSelectedOptionId(option.id)}
            />
          );
        })}
      </div>

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      {!answered && (
        <SessionFooter>
          <p className="font-pixel-label text-[8px] text-muted">1 tentativa · teclas 1–{options.length} escolhem, Enter confirma</p>
          <PixelButton onClick={handleSubmit} disabled={!selectedOptionId || submitting}>
            {submitting ? 'Enviando...' : 'Confirmar ›'}
          </PixelButton>
        </SessionFooter>
      )}

      {answered && lastResponse && (
        <FeedbackPanel passed={lastResponse.passed} score={lastResponse.score} seed={activity.id} onContinue={onContinue} />
      )}
    </>
  );
}
