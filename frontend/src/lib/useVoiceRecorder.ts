import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderPhase = 'pronto' | 'gravando' | 'enviando';

/**
 * Gravador do áudio das Salas (Fase 110): MediaRecorder no microfone, para sozinho em `maxSeconds` e entrega o
 * webm em `onDone`. Mesma gravação do resumo falado (VoiceSummaryActivity), sem a leitura em voz alta da pergunta.
 */
export function useVoiceRecorder(onDone: (audio: Blob) => Promise<void>, maxSeconds = 90) {
  const [phase, setPhase] = useState<RecorderPhase>('pronto');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const release = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    release();
  }, [release]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = () => {
        setPhase('enviando');
        onDoneRef
          .current(new Blob(chunksRef.current, { type: recorder.mimeType }))
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Não deu pra enviar o áudio. Grave de novo.'))
          .finally(() => setPhase('pronto'));
      };
      recorder.start();
      setSeconds(0);
      setPhase('gravando');
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= maxSeconds) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      release();
      setError('Não consegui usar o microfone. Libere o acesso no navegador e tente de novo.');
    }
  }, [maxSeconds, release, stop]);

  return { phase, seconds, error, start, stop };
}
