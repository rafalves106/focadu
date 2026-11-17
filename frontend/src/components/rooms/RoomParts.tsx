import { useState, type ReactNode } from 'react';
import type { RoomState, RoomTask, RoomVoiceResult } from '../../api/rooms';
import { clock, detectStartSystem, startCommands, taskMinutes, unit, type StartSystem } from '../../lib/roomText';
import type { RecorderPhase } from '../../lib/useVoiceRecorder';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';
import { FocadaLine } from '../ui/FocadaLine';
import { PixelIcon } from '../ui/PixelIcon';
import { PixelMic } from '../session/PixelMic';

// Fase 110: peças das telas de Sala (Figma "Salas práticas (proposta)", componentes 68:24, 68:88, 68:139, 68:196, 83:1095).

const linkStyle = 'text-rotulo-sm text-accent hover:text-accent-hover';

/**
 * Sala/Painel da máquina (68:139). A Focadu não vê a máquina do aluno: "Já subi a máquina" e "A máquina caiu?
 * Desmarcar" são só a marcação dele. O ambiente vem num zip baixado daqui e sobe com o iniciar.sh, que derruba tudo
 * sozinho ao sair (Ctrl+C, fechar o terminal ou 2 h).
 */
export function MachinePanel({
  room,
  busy,
  onToggle,
  onDownload,
}: {
  room: RoomState;
  busy: boolean;
  onToggle: (on: boolean) => void;
  onDownload: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [system, setSystem] = useState<StartSystem>(detectStartSystem);
  // Fase 112: com a máquina ligada os comandos recolhem, pro painel caber sem rolar junto do Progresso.
  const [showCommands, setShowCommands] = useState(false);
  const commandsOpen = !room.machineOn || showCommands;
  const commands = startCommands(room, system);
  const prompt = system === 'windows' ? '>' : '$';
  const copy = () => {
    void navigator.clipboard?.writeText(commands.join('\n')).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <section aria-label="Sua máquina" className="flex flex-col gap-4 border-2 border-stroke bg-surface p-6">
      <div className="flex items-center justify-between">
        <p className="text-rotulo-sm text-secondary">Sua máquina</p>
        {room.machineOn ? <Chip tone="verde">Ligada por você</Chip> : <Chip>Desligada</Chip>}
      </div>
      <p className="text-lead text-primary">{room.machineLabel}</p>
      {!room.machineOn && (
        <button type="button" onClick={onDownload} className={`self-start ${linkStyle}`}>
          1. Baixar a sala (.zip)
        </button>
      )}
      {commandsOpen && (
        <>
        <div className="flex items-start justify-between gap-4 border-2 border-stroke-strong bg-surface-alt px-4 py-2">
          <div className="flex min-w-0 flex-col text-codigo text-primary">
            {commands.map((line) => (
              <code key={line} className="break-words">{prompt} {line}</code>
            ))}
          </div>
          <button type="button" onClick={copy} className={`shrink-0 ${linkStyle}`}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setSystem(system === 'windows' ? 'unix' : 'windows')}
          className={`self-start ${linkStyle}`}
        >
          {system === 'windows' ? 'Está no macOS ou Linux? Ver os comandos do terminal' : 'Está no Windows? Ver os comandos do PowerShell'}
        </button>
        </>
      )}
      {room.machineOn ? (
        <>
          <p className="text-pequeno text-secondary">Kali e alvo no ar na sua máquina.</p>
          <a
            href="https://127.0.0.1:6901"
            target="_blank"
            rel="noreferrer"
            className="flex h-12 w-full items-center justify-center border-2 border-stroke-strong px-6 text-rotulo text-primary hover:border-accent hover:bg-accent-tint hover:text-accent"
          >
            Abrir o desktop do Kali
          </a>
          <p className="text-pequeno text-muted">127.0.0.1:6901 · abre em outra aba · usuário kasm_user, senha focadu</p>
          <div className="flex flex-col gap-2">
            <p className="text-pequeno text-muted">Pra desligar: Ctrl+C no terminal. Ela também desliga sozinha em 2 h.</p>
            <button type="button" disabled={busy} onClick={() => onToggle(false)} className={`self-start ${linkStyle}`}>
              A máquina caiu? Desmarcar
            </button>
            {!showCommands && (
              <button type="button" onClick={() => setShowCommands(true)} className={`self-start ${linkStyle}`}>
                Ver os comandos de novo
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-pequeno text-secondary">
            2. No terminal (no Windows, no PowerShell), rode os comandos acima. Quando o desktop do Kali abrir em 127.0.0.1:6901, marque aqui.
          </p>
          <Button kind="secundario" full loading={busy} onClick={() => onToggle(true)}>
            Já subi a máquina
          </Button>
          <p className="text-pequeno text-muted">A Focadu não vê a sua máquina: é você quem marca.</p>
        </>
      )}
    </section>
  );
}

/** Sala/Campo de flag (68:24): Vazio, Foco, Certa (borda verde + Chip) e Errada (frase abaixo). */
export function FlagField({
  label,
  value,
  placeholder,
  correct,
  error,
  disabled,
  onChange,
  onSubmit,
}: {
  label: string;
  value: string;
  placeholder: string;
  correct?: boolean;
  error?: string | null;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
}) {
  const border = correct ? 'border-accent bg-accent-tint' : error ? 'border-alert bg-surface' : 'border-stroke-strong bg-surface focus-within:border-accent';
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-rotulo-sm text-secondary">{label}</span>
        <span className={`flex h-12 items-center justify-between gap-4 border-2 px-4 ${border}`}>
          <input
            value={value}
            readOnly={correct}
            disabled={disabled}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()}
            className="min-w-0 flex-1 bg-transparent text-corpo text-primary outline-none placeholder:text-muted"
          />
          {correct && <Chip tone="verde">Certa</Chip>}
        </span>
      </label>
      {error && <p className="text-pequeno text-alert">{error}</p>}
    </div>
  );
}

/** Sala/Gravador de voz (68:88): Pronto, Gravando e Enviando. */
export function Recorder({
  phase,
  seconds,
  error,
  onStart,
  onStop,
  hint,
}: {
  phase: RecorderPhase;
  seconds: number;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  hint: string;
}) {
  const recording = phase === 'gravando';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4 border-2 border-stroke bg-base p-4">
        <span className="flex size-10 shrink-0 items-center justify-center border-2 border-stroke bg-surface-alt">
          <PixelMic recording={recording} className="size-8" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className={`text-rotulo-sm ${recording ? 'text-alert' : 'text-primary'}`}>
            {phase === 'enviando' ? 'Avaliando seu áudio' : recording ? 'Gravando' : 'Pronto pra gravar'}
          </p>
          <p className="text-pequeno text-muted">{hint}</p>
        </div>
        <span className="text-pequeno text-muted tabular-nums">{clock(seconds)}</span>
        {recording ? (
          <Button kind="perigo" onClick={onStop}>
            Parar e enviar
          </Button>
        ) : (
          <Button loading={phase === 'enviando'} onClick={onStart}>
            Gravar
          </Button>
        )}
      </div>
      {error && <p className="text-pequeno text-alert">{error}</p>}
    </div>
  );
}

/** Devolutiva do áudio: nota da Focada, pontos a melhorar e a resposta curada sob demanda. */
export function VoiceFeedback({ voice, seconds }: { voice: RoomVoiceResult; seconds?: number }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap gap-4 text-rotulo-sm text-secondary">
        <span>Seu áudio{seconds ? ` · ${seconds} s` : ''}</span>
        <button type="button" className={linkStyle} onClick={() => setShowTranscript((v) => !v)}>
          {showTranscript ? 'Esconder transcrição' : 'Ver transcrição'}
        </button>
        <button type="button" className={linkStyle} onClick={() => setShowAnswer((v) => !v)}>
          {showAnswer ? 'Esconder resposta completa' : 'Ver resposta completa'}
        </button>
      </p>
      {showTranscript && <p className="border-2 border-stroke bg-base p-4 text-pequeno text-secondary">{voice.transcript}</p>}
      <FocadaLine size="devolutiva" tone={voice.score >= 80 ? 'acerto' : 'erro'} label={`Focada · Nota ${voice.score}`}>
        {voice.improvementPoints || 'Explicação completa. Pode seguir.'}
      </FocadaLine>
      {showAnswer && <p className="border-2 border-stroke bg-base p-4 text-pequeno text-secondary">{voice.correctAnswer}</p>}
    </div>
  );
}

/** Sala/Tarefa fechada (68:196): Concluída (check, nota e tempo) ou Trancada (cadeado e o que falta). */
export function TaskRow({ room, task, prefix, lockedNote }: { room: RoomState; task: RoomTask; prefix: string; lockedNote?: string }) {
  const done = task.state === 'Done';
  const minutes = taskMinutes(room, task);
  return (
    <li className="flex h-12 items-center gap-4 border-2 border-stroke bg-surface px-6">
      <PixelIcon name={done ? 'check' : 'lock'} className={done ? 'text-accent' : 'text-muted'} />
      <span className={`shrink-0 text-rotulo-sm ${done ? 'text-secondary' : 'text-muted'}`}>{prefix}</span>
      <span className={`min-w-0 flex-1 truncate text-corpo ${done ? 'text-primary' : 'text-muted'}`}>{task.title}</span>
      {done ? (
        <span className="shrink-0 text-rotulo-sm text-accent">
          Nota {task.voice!.score}
          {minutes ? ` · ${minutes} min` : ''}
        </span>
      ) : (
        <span className="hidden shrink-0 text-pequeno text-muted md:inline">{lockedNote}</span>
      )}
    </li>
  );
}

/** Mapa da invasão (sala-desafio, componente Sala/Elo da cadeia 83:1095): elos feitos, atual e trancados. */
export function ChainMap({ room }: { room: RoomState }) {
  return (
    <section aria-label="Mapa da invasão" className="flex flex-col gap-3 border-2 border-stroke bg-surface px-6 py-4">
      <p className="text-rotulo-sm text-secondary">Mapa da invasão</p>
      <ol className="flex items-start">
        {room.tasks.map((task, index) => {
          const done = task.state === 'Done';
          const current = task.state === 'Current' || task.state === 'AwaitingVoice';
          const box = done
            ? 'border-accent bg-accent text-base'
            : current
              ? 'border-accent bg-accent-tint text-accent'
              : 'border-stroke bg-surface text-muted';
          return (
            <li key={task.id} className="flex flex-1 items-start">
              <div className="flex w-32 shrink-0 flex-col items-center gap-2 text-center">
                <span className={`flex size-10 items-center justify-center border-2 ${box}`}>
                  <PixelIcon name={done ? 'check' : current ? 'play' : 'lock'} />
                </span>
                <span className={`text-rotulo-sm ${done || current ? 'text-secondary' : 'text-muted'} ${current ? '!text-accent' : ''}`}>
                  {task.chainLabel ?? `${unit(room)} ${task.number}`}
                </span>
                <span className="text-pequeno text-muted">{done ? `Nota ${task.voice!.score}` : `flag do elo ${task.number}`}</span>
              </div>
              {index < room.tasks.length - 1 && (
                <span aria-hidden="true" className={`mt-5 h-0.5 flex-1 ${done ? 'bg-accent' : 'bg-stroke-strong'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Cartão/Suave · Progresso da sala. */
export function ProgressCard({ title = 'Progresso da sala', done, total, children }: { title?: string; done: number; total: number; children: ReactNode }) {
  return (
    <Card kind="suave" eyebrow={title} pad="gap-3 p-6">
      <div className="h-1.5 w-full bg-stroke" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="h-1.5 bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <p className="text-pequeno text-secondary">{children}</p>
    </Card>
  );
}
