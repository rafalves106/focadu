import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { getRecordingLimitMinutes } from '../lib/settings';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

type RecorderState = 'idle' | 'recording' | 'submitting' | 'answered' | 'permission_denied';

/**
 * Espera a lista de vozes do navegador carregar (em muitos navegadores getVoices() volta vazio
 * na primeira chamada, so populando apos o evento 'voiceschanged') - com timeout curto pra nao
 * travar a leitura pra sempre se o evento nunca disparar (ou nao houver voz nenhuma instalada).
 */
function getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const immediate = synth.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    const onChange = () => {
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', onChange);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onChange);
      resolve(synth.getVoices());
    }, 300);
  });
}

/**
 * Entre as vozes em portugues disponiveis, prefere uma "de rede" (Google/Microsoft Online) -
 * essas costumam soar bem mais naturais que a voz local do SO (ex: eSpeak no Linux). Sem garantia
 * de qualidade (o navegador nao expoe isso), so uma heuristica pelo nome da voz.
 */
function pickBestPortugueseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ptBr = voices.filter((v) => v.lang.toLowerCase().startsWith('pt-br'));
  const pool = ptBr.length > 0 ? ptBr : voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
  if (pool.length === 0) return null;

  return pool.find((v) => /google|online|natural/i.test(v.name)) ?? pool[0];
}

/**
 * Le a pergunta em voz alta ao entrar na atividade (Web Speech API - nativa do navegador, sem
 * servico/dependencia externa) e expõe quantos caracteres ja foram falados, pra colorir a
 * pergunta palavra a palavra conforme a voz avança (estetica "karaoke" pedida). `onboundary` nem
 * sempre dispara por palavra em todo navegador/voz (alguns so disparam por frase) - nesse caso o
 * texto so muda de cor de uma vez ao final; degrade aceitavel, nao quebra a leitura em si.
 */
function usePromptVoice(text: string) {
  const [spokenChars, setSpokenChars] = useState(0);
  // ponytail: leitura por voz desativada a pedido do usuario; reverter pra
  // `typeof window !== 'undefined' && 'speechSynthesis' in window` pra reativar.
  const supported = false;

  const speak = useCallback(async () => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    setSpokenChars(0);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.voice = pickBestPortugueseVoice(await getVoicesAsync());
    utterance.onboundary = (event) => setSpokenChars(event.charIndex);
    utterance.onend = () => setSpokenChars(text.length);
    window.speechSynthesis.speak(utterance);
  }, [text, supported]);

  // So le uma vez, ao entrar na atividade - nao a cada re-render (o replay manual cobre "ouvir de novo").
  useEffect(() => {
    void speak();
    return () => window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { spokenChars, supported, replay: speak };
}

/** Divide o texto em palavras (com o espaço que as segue) e colore cada uma conforme ja foi falada ou nao. */
function VoicedPrompt({ text, spokenChars, highlight }: { text: string; spokenChars: number; highlight: boolean }) {
  const words = useMemo(() => Array.from(text.matchAll(/\S+\s*/g), (m) => ({ text: m[0], start: m.index ?? 0 })), [text]);

  if (!highlight) return <>{text}</>;

  return (
    <>
      {words.map((word, i) => (
        <span key={i} className={`transition-colors duration-300 ${word.start <= spokenChars ? 'text-primary' : 'text-muted'}`}>
          {word.text}
        </span>
      ))}
    </>
  );
}

/**
 * VoiceSummary: grava um resumo falado (MediaRecorder) e envia como multipart/form-data pro
 * endpoint de audio - o backend transcreve (Groq Whisper) e avalia (Groq chat completion) contra
 * o CuratedContent de referencia. Score/Passed vem inteiramente da avaliacao, nunca do cliente
 * (mesma garantia dos outros 4 tipos de atividade).
 *
 * Fase 19 (fidelidade revisada, node "Sessão Diária — Resumo Falado"): unico tipo de atividade
 * sem cartao ao redor (`SessionLayout card={false}`) - o Figma mostra a gravação flutuando direto
 * sobre o fundo. Legenda "Baseado em: ..." do mockup omitida - exigiria buscar o CuratedContent
 * só pra essa legenda (chamada de API nova), fora do escopo de uma fase que é só estilo.
 */
export function VoiceSummaryActivity({
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
  const [state, setState] = useState<RecorderState>(activity.responses.length > 0 ? 'answered' : 'idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);
  const { weekly, sidebar } = useMaterialSidebar(daily);
  const { spokenChars, supported: voiceSupported, replay: replayPrompt } = usePromptVoice(activity.prompt ?? '');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Le uma vez por montagem - configuravel em "Limite de gravação" no menu de configurações
  // (frontend/src/lib/settings.ts), efeito so na proxima sessao/atividade aberta.
  const maxRecordingSeconds = useMemo(() => getRecordingLimitMinutes() * 60, []);

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
    if (state === 'recording' && seconds >= maxRecordingSeconds) {
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

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === activity.id);
  const total = sortedActivities.length;

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — RESUMO FALADO`}
      progress={(stepIndex + 1) / total}
      sidebar={sidebar}
      card={state === 'answered'}
    >
      {state !== 'answered' && (
        <div className="flex max-w-[560px] flex-col items-start gap-3">
          <p className="text-xl font-semibold leading-[1.4] text-primary">
            <VoicedPrompt text={activity.prompt ?? ''} spokenChars={spokenChars} highlight={voiceSupported} />
          </p>
          {voiceSupported && (
            <button type="button" onClick={replayPrompt} className="text-xs text-muted hover:text-primary">
              🔊 Ouvir a pergunta de novo
            </button>
          )}
        </div>
      )}

      {state === 'permission_denied' && (
        <p className="text-alert">
          Não conseguimos acessar o microfone - verifique a permissão do navegador pra este site e tente de novo.
        </p>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}

      {state !== 'submitting' && state !== 'answered' && (
        <div className="flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={state === 'recording' ? handleStop : handleStart}
            aria-label={state === 'recording' ? 'Parar gravação' : 'Começar a gravar'}
            className={[
              'flex size-[180px] items-center justify-center rounded-full text-6xl transition-shadow duration-300',
              state === 'recording'
                ? 'animate-pulse bg-alert/20 shadow-[0_0_0_14px_rgba(255,59,59,0.15)]'
                : 'bg-accent/20 shadow-[0_0_0_10px_rgba(57,255,106,0.15)] hover:shadow-[0_0_0_14px_rgba(57,255,106,0.22)]',
            ].join(' ')}
          >
            🎙️
          </button>

          {state === 'recording' ? (
            <p className="flex items-center gap-2 font-mono text-xs tracking-[1px] text-secondary uppercase">
              <span className="size-2 rounded-full bg-alert" aria-hidden="true" />
              Gravando — {minutes}:{secs} / limite 10:00
            </p>
          ) : (
            <p className="text-sm text-secondary">
              {state === 'permission_denied' ? 'Toque pra tentar de novo' : 'Toque pra começar a gravar'}
            </p>
          )}

          {state === 'recording' && (
            <button type="button" onClick={handleStop} className="text-sm text-muted hover:text-primary">
              Toque para parar quando terminar de explicar
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
    </SessionLayout>
  );
}
