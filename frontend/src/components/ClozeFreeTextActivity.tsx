import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { ActivityScreen } from './Layout';
import { FeedbackPanel } from './FeedbackPanel';

/**
 * Cloze/FreeText ("usado para codigo"): campo de texto livre, comparado no servidor contra
 * ExpectedAnswer (comparacao textual simples, sem IA - ver
 * SubmitActivityResponseUseCase.ScoreFromFreeTextAnswer). Pede uma justificativa breve antes de
 * revelar se acertou - so armazenada nesta fase, sem avaliacao.
 */
export function ClozeFreeTextActivity({
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
  const [transcript, setTranscript] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState(activity.expectedAnswer);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);

  const answered = lastResponse !== null;

  async function handleSubmit() {
    if (!transcript.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitActivityResponse(dailyId, activity.id, {
        transcript: transcript.trim(),
        justification: justification.trim() || undefined,
      });
      setLastResponse(result.response);

      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      if (refreshedActivity) setExpectedAnswer(refreshedActivity.expectedAnswer);
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActivityScreen eyebrow="Complete o código" title={activity.prompt ?? ''}>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-secondary">Sua resposta</span>
        <input
          type="text"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={answered || submitting}
          placeholder="ex: cookie"
          className="rounded-xl border border-surface-alt bg-surface px-4 py-3 font-mono text-primary outline-none focus:border-accent disabled:opacity-70"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-secondary">Por que essa resposta? (opcional)</span>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          disabled={answered || submitting}
          rows={2}
          className="resize-none rounded-xl border border-surface-alt bg-surface px-4 py-3 text-primary outline-none focus:border-accent disabled:opacity-70"
        />
      </label>

      {error && <p className="text-sm text-alert">{error}</p>}

      {!answered && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!transcript.trim() || submitting}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-base disabled:opacity-40"
        >
          {submitting ? 'Enviando...' : 'Responder'}
        </button>
      )}

      {answered && lastResponse && (
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          transcript={transcript}
          detail={
            expectedAnswer && (
              <p className="text-sm text-secondary">
                Resposta esperada: <span className="font-mono">{expectedAnswer}</span>
              </p>
            )
          }
          onContinue={onContinue}
        />
      )}
    </ActivityScreen>
  );
}
