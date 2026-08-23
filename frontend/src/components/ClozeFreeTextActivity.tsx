import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { FeedbackPanel } from './FeedbackPanel';
import { IntroCard } from './activities/IntroCard';
import { CodeHighlight } from './activities/CodeHighlight';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

/**
 * Cloze/FreeText ("usado para codigo"): campo de texto livre, comparado no servidor contra
 * ExpectedAnswer (comparacao textual simples, sem IA - ver
 * SubmitActivityResponseUseCase.ScoreFromFreeTextAnswer). Pede uma justificativa breve antes de
 * revelar se acertou - so armazenada nesta fase, sem avaliacao.
 *
 * Fase 9 (design Figma "Cloze 1-6"): ganhou Intro (`started`, gate local) e o prompt passou a
 * renderizar via CodeHighlight (realca a lacuna "___").
 *
 * Fase 19 (fidelidade revisada, node "sessao-cloze-test"): o mockup usa um campo de justificativa
 * "toque para gravar" (icone de microfone) - mantido como campo de texto (Justification e sempre
 * texto no dominio, ver Fase 4; nenhum audio e enviado pra esta atividade, so pra VoiceSummary,
 * que tem seu proprio endpoint) - um botao de gravar que nao grava seria uma afordancia falsa.
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
  const [started, setStarted] = useState(activity.responses.length > 0);
  const [transcript, setTranscript] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState(activity.expectedAnswer);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);
  const { weekly, sidebar } = useMaterialSidebar(daily);

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

  if (!started) {
    return (
      <IntroCard
        badge="Cloze test"
        title="Complete o código"
        description="Preencha a lacuna com o termo certo."
        rules={['1 tentativa - sem retorno.', 'Uma justificativa breve é opcional, antes de ver o gabarito.']}
        ctaLabel="COMEÇAR"
        onStart={() => setStarted(true)}
      />
    );
  }

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const total = sortedActivities.length;

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — CLOZE TEST`}
      progress={(stepIndex + 1) / total}
      sidebar={sidebar}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Cloze test</p>
        <p className="text-[22px] font-semibold leading-[1.3] text-primary">Preencha a lacuna</p>
      </div>

      <CodeHighlight text={activity.prompt ?? ''} />

      <label className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Sua resposta</span>
        <input
          type="text"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={answered || submitting}
          placeholder="ex: cookie"
          className="rounded-xl border border-stroke bg-surface-alt px-4 py-3 font-mono text-primary outline-none focus:border-accent disabled:opacity-70"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Justificativa (opcional)</span>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          disabled={answered || submitting}
          rows={2}
          className="resize-none rounded-xl border border-stroke bg-surface-alt px-4 py-3 text-primary outline-none focus:border-accent disabled:opacity-70"
        />
      </label>

      {error && <p className="text-sm text-alert">{error}</p>}

      {!answered && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!transcript.trim() || submitting}
          className="rounded-xl bg-accent py-4 text-sm font-semibold tracking-[1px] text-base disabled:opacity-40"
        >
          {submitting ? 'ENVIANDO...' : 'CONFIRMAR'}
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
    </SessionLayout>
  );
}
