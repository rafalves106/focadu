import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { getRecordingLimitMinutes } from '../lib/settings';
import { useSession } from '../lib/sessionContext';
import { FeedbackPanel } from './FeedbackPanel';
import { SessionFooter, SessionLayout } from './SessionShell';
import { DailyNotesModal } from './notebook/DailyNotesModal';
import { PixelMic } from './session/PixelMic';
import { PixelButton, PixelChip } from './session/PixelButton';

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
 * o CuratedContent de referencia. Score/Passed vem inteiramente da avaliacao, nunca do cliente.
 *
 * Fase 35 (ver secret/rascunhos/caderninho-no-resumo-falado.md): "Reler minhas anotacoes" so ANTES
 * de comecar a gravar (`idle`/`permission_denied`), nunca durante nem depois - consultar o caderninho
 * pra relembrar e legitimo, ler em voz alta enquanto grava esvaziaria a atividade (avaliar recall).
 *
 * Fase 68 (Figma "Daily — 02/03/04"): microfone pixel art (grava ao clicar nele ou no botao), barras
 * animadas enquanto grava (decorativas - nao medem o volume), anotacoes da coluna direita travadas
 * durante a gravacao e, no resultado, a nota grande com o feedback da IA na voz da Focada.
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
  const { weekly } = useSession();
  const [state, setState] = useState<RecorderState>(activity.responses.length > 0 ? 'answered' : 'idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState(activity.responses.at(-1) ?? null);
  const [showNotes, setShowNotes] = useState(false);
  const { spokenChars, supported: voiceSupported } = usePromptVoice(activity.prompt ?? '');

  // Defensivo (ver doc acima) - fecha sozinho se a gravacao comecar com o modal aberto.
  useEffect(() => {
    if (state === 'recording') setShowNotes(false);
  }, [state]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Le uma vez por montagem - configuravel em "Limite de gravacao" nas Configuracoes.
  const maxRecordingSeconds = useMemo(() => getRecordingLimitMinutes() * 60, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  // Para automaticamente ao atingir o limite - fora do handler do interval (efeito colateral).
  useEffect(() => {
    if (state === 'recording' && seconds >= maxRecordingSeconds) handleStop();
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
      const refreshedDaily = await api.getDaily(dailyId);
      setLastResponse(result.response);
      setState('answered');
      onDailyRefetched(refreshedDaily);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar sua gravação. Tente de novo.');
      setState('idle');
    }
  }

  // Timer num efeito proprio, disparado so na transicao pra 'recording' (nao a cada segundo).
  useEffect(() => {
    if (state !== 'recording') return;
    timerRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const clock = (total: number) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  const recording = state === 'recording';
  const busy = recording || state === 'submitting';

  return (
    <SessionLayout notesLocked={busy} hideBack={busy}>
      {state !== 'answered' && (
        <>
          <p className="font-pixel text-2xl leading-[1.15] text-primary lg:text-[26px] lg:short:text-[22px] lg:tight:text-xl">
            <VoicedPrompt text={activity.prompt ?? ''} spokenChars={spokenChars} highlight={voiceSupported} />
          </p>
          <div className="flex flex-wrap gap-2">
            <PixelChip>Só por voz</PixelChip>
            <PixelChip>Até {Math.round(maxRecordingSeconds / 60)} min</PixelChip>
            <PixelChip>Vale 2× no score</PixelChip>
          </div>

          <button
            type="button"
            onClick={recording ? handleStop : handleStart}
            disabled={state === 'submitting'}
            aria-label={recording ? 'Parar e enviar' : 'Começar a gravar'}
            className={`flex min-h-[190px] flex-1 flex-col items-center justify-center gap-3 border-2 bg-surface px-6 py-6 lg:short:min-h-[112px] lg:short:gap-2 lg:short:py-3 lg:tight:min-h-[96px] ${
              recording ? 'border-alert' : 'border-stroke hover:border-accent'
            }`}
          >
            <PixelMic recording={recording} className="size-24 lg:short:size-16" />
            {recording && (
              <span className="flex h-9 items-end gap-1" aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => (
                  <span
                    key={i}
                    className="w-2 animate-pulse bg-alert"
                    style={{ height: `${8 + ((i * 7) % 26)}px`, animationDelay: `${(i % 5) * 120}ms` }}
                  />
                ))}
              </span>
            )}
            {state === 'submitting' ? (
              <span className="font-pixel text-2xl text-secondary">Transcrevendo e avaliando...</span>
            ) : recording ? (
              <span className="font-pixel text-3xl leading-none text-alert">
                ● Gravando {clock(seconds)} / {clock(maxRecordingSeconds)}
              </span>
            ) : (
              <>
                <span className="font-pixel-label text-[11px] text-accent">
                  {state === 'permission_denied' ? 'Toque pra tentar de novo' : 'Aperte gravar quando estiver pronto'}
                </span>
                <span className="font-pixel text-2xl leading-none text-secondary">00:00 / {clock(maxRecordingSeconds)}</span>
              </>
            )}
            {recording && <span className="font-pixel text-lg leading-tight text-secondary">As anotações ficam travadas até você parar — vale o que você lembra.</span>}
          </button>

          {state === 'permission_denied' && (
            <p className="font-pixel text-lg leading-tight text-alert">Não conseguimos acessar o microfone - verifique a permissão do navegador pra este site e tente de novo.</p>
          )}
          {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

          <SessionFooter>
            {(state === 'idle' || state === 'permission_denied') && weekly && (
              <PixelButton ghost tone="project" onClick={() => setShowNotes(true)}>
                {daily.isReinforcement ? 'Reler anotações do dia base' : 'Reler minhas anotações'}
              </PixelButton>
            )}
            {state !== 'submitting' && (
              <PixelButton tone={recording ? 'accent' : 'alert'} onClick={recording ? handleStop : handleStart}>
                {recording ? '■ Parar e enviar' : '● Gravar'}
              </PixelButton>
            )}
          </SessionFooter>
        </>
      )}

      {state === 'answered' && lastResponse && (
        <FeedbackPanel
          passed={lastResponse.passed}
          score={lastResponse.score}
          showScore
          focadaInContent
          seed={activity.id}
          transcript={lastResponse.transcript}
          aiFeedback={lastResponse.aiFeedback}
          onContinue={onContinue}
        />
      )}

      {showNotes && weekly && (
        <DailyNotesModal courseId={weekly.courseId} dailyId={daily.id} isReinforcement={daily.isReinforcement} onClose={() => setShowNotes(false)} />
      )}
    </SessionLayout>
  );
}
