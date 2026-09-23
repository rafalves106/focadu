import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { ClozeSentence } from './activities/ClozeSentence';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionFooter, SessionLayout } from './SessionShell';
import { BlockIntro } from './session/BlockIntro';
import { PixelButton } from './session/PixelButton';
import checkIcon from '../assets/pixel/check.png';

/**
 * Lacuna de texto livre (Cloze/FreeText): o aluno digita a palavra, comparada no servidor contra
 * ExpectedAnswer (comparacao textual simples, sem IA - ver SubmitActivityResponseUseCase). A
 * justificativa breve continua opcional e so e guardada, sem avaliacao (Fase 4).
 *
 * Fase 68 (Figma "Daily — 08/12"): frase em caixa com a lacuna em ambar, campo em VT323 e, depois de
 * responder, a sua resposta ao lado da certa; Enter confirma.
 */
export function ClozeFreeTextActivity({
  dailyId,
  daily,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || activity.responses.length > 0);
  const [transcript, setTranscript] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState(activity.expectedAnswer);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);

  const answered = lastResponse !== null;
  const given = transcript.trim() || lastResponse?.transcript || '';

  async function handleSubmit() {
    if (!transcript.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitActivityResponse(dailyId, activity.id, {
        transcript: transcript.trim(),
        justification: justification.trim() || undefined,
      });
      const refreshedDaily = await api.getDaily(dailyId);
      const refreshedActivity = refreshedDaily.activities.find((a) => a.id === activity.id);
      if (refreshedActivity) setExpectedAnswer(refreshedActivity.expectedAnswer);
      setLastResponse(result.response);
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar sua resposta. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!started) return <BlockIntro activity={activity} onStart={() => setStarted(true)} />;

  return (
    <SessionLayout>
      <ClozeSentence
        text={activity.prompt ?? ''}
        fill={answered && expectedAnswer ? { value: expectedAnswer, correct: true } : undefined}
      />

      {!answered ? (
        <>
          <label className="flex flex-col gap-2">
            <span className="font-pixel-label text-[9px] text-secondary">Sua resposta</span>
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSubmit();
              }}
              disabled={submitting}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="a palavra que falta"
              className="border-2 border-project bg-base px-4 py-2.5 font-pixel text-3xl leading-none text-primary outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
            />
          </label>
          <p className="font-pixel text-lg leading-tight text-secondary">Maiúscula ou minúscula tanto faz — o que vale é a grafia.</p>
          <details className="border-2 border-stroke px-4 py-3">
            <summary className="cursor-pointer font-pixel-label text-[9px] text-secondary">Justificativa (opcional)</summary>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={submitting}
              rows={2}
              className="mt-3 w-full resize-none border-2 border-stroke bg-surface px-3 py-2 font-pixel text-lg leading-tight text-primary outline-none focus:border-accent"
            />
          </details>
          {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}
          <SessionFooter>
            <p className="font-pixel-label text-[8px] text-muted">1 tentativa · Enter confirma</p>
            <PixelButton onClick={handleSubmit} disabled={!transcript.trim() || submitting}>
              {submitting ? 'Enviando...' : 'Confirmar ›'}
            </PixelButton>
          </SessionFooter>
        </>
      ) : (
        lastResponse && (
          <>
            <FeedbackPanel
              passed={lastResponse.passed}
              score={lastResponse.score}
              seed={activity.id}
              onContinue={onContinue}
              detail={
                <div className="flex flex-wrap items-center gap-3">
                  {given && (
                    <span
                      className={`flex items-center gap-2 border-2 px-3 py-2 font-pixel text-2xl leading-none ${
                        lastResponse.passed ? 'border-accent text-accent' : 'border-alert text-alert'
                      }`}
                    >
                      {given}
                      {lastResponse.passed ? <img src={checkIcon} alt="" className="size-4 pixelated" /> : <span className="font-pixel-label text-[10px]">✕</span>}
                    </span>
                  )}
                  {!lastResponse.passed && expectedAnswer && (
                    <span className="flex items-center gap-2 border-2 border-accent px-3 py-2 font-pixel text-2xl leading-none text-accent">
                      {expectedAnswer}
                      <img src={checkIcon} alt="" className="size-4 pixelated" />
                    </span>
                  )}
                </div>
              }
            />
          </>
        )
      )}
    </SessionLayout>
  );
}
