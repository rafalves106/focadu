import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { ActivityScreen } from './Layout';
import { FeedbackPanel } from './FeedbackPanel';

const MAX_RECORDING_SECONDS = 10 * 60;

type RecorderState = 'idle' | 'recording' | 'submitting' | 'answered' | 'permission_denied';

/**
 * VoiceSummary: grava um resumo falado (MediaRecorder) e envia como multipart/form-data pro
 * endpoint de audio - o backend transcreve (Groq Whisper) e avalia (Groq chat completion) contra
 * o CuratedContent de referencia. Score/Passed vem inteiramente da avaliacao, nunca do cliente
 * (mesma garantia dos outros 4 tipos de atividade).
 */
export function VoiceSummaryActivity({
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
  const [state, setState] = useState<RecorderState>(activity.responses.length > 0 ? 'answered' : 'idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  // Para automaticamente ao atingir o limite - separado do handler do interval pra nao chamar
  // efeito colateral (parar a gravacao) de dentro de um updater de estado.
  useEffect(() => {
    if (state === 'recording' && seconds >= MAX_RECORDING_SECONDS) {
      handleStop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, state]);

  async function handleStart() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void handleSubmit(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setState('recording');
    } catch {
      setState('permission_denied');
    }
  }

  function handleStop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setState('submitting');
  }

  async function handleSubmit(audioBlob: Blob) {
    try {
      const result = await api.submitVoiceSummaryResponse(dailyId, activity.id, audioBlob);
      setLastResponse(result.response);
      setState('answered');
      onDailyRefetched(await api.getDaily(dailyId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao foi possivel enviar sua gravacao. Tente de novo.');
      setState('idle');
    }
  }

  // O timer roda num efeito proprio, disparado so na transicao pra 'recording' (nao a cada
  // segundo) - evita recriar o interval a cada tick.
  useEffect(() => {
    if (state !== 'recording') return;
    timerRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <ActivityScreen eyebrow="Resumo falado" title={activity.prompt ?? ''}>
      {state === 'permission_denied' && (
        <p className="text-alert">
          Não conseguimos acessar o microfone - verifique a permissão do navegador pra este site e tente de novo.
        </p>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}

      {state !== 'submitting' && state !== 'answered' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <button
            type="button"
            onClick={state === 'recording' ? handleStop : handleStart}
            aria-label={state === 'recording' ? 'Parar gravação' : 'Começar a gravar'}
            className={[
              'flex h-28 w-28 items-center justify-center rounded-full text-4xl transition-shadow duration-300',
              state === 'recording'
                ? 'animate-pulse bg-alert/20 shadow-[0_0_0_10px_rgba(255,59,59,0.15)]'
                : 'bg-accent/20 shadow-[0_0_0_8px_rgba(57,255,106,0.15)] hover:shadow-[0_0_0_12px_rgba(57,255,106,0.22)]',
            ].join(' ')}
          >
            🎙️
          </button>

          {state === 'recording' ? (
            <p className="font-mono text-lg text-alert">
              {minutes}:{secs} <span className="text-sm text-secondary">/ 10:00</span>
            </p>
          ) : (
            <p className="text-sm text-secondary">
              {state === 'permission_denied' ? 'Toque pra tentar de novo' : 'Toque pra começar a gravar'}
            </p>
          )}

          {state === 'recording' && (
            <button type="button" onClick={handleStop} className="text-sm text-secondary hover:text-primary">
              Parar gravação
            </button>
          )}
        </div>
      )}

      {state === 'submitting' && (
        <div className="flex flex-col items-center gap-2 py-6">
          <p className="text-secondary">Transcrevendo e avaliando sua resposta...</p>
          <p className="text-xs text-muted">Isso pode levar alguns segundos.</p>
        </div>
      )}

      {state === 'answered' && lastResponse && (
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          transcript={lastResponse.transcript}
          aiFeedback={lastResponse.aiFeedback}
          onContinue={onContinue}
        />
      )}
    </ActivityScreen>
  );
}
