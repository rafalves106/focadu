import {
  POMODORO_PRESETS,
  currentPhaseTotalSeconds,
  formatPomodoroTime,
  pausePomodoroTimer,
  resetPomodoroTimer,
  selectPomodoroPreset,
  startPomodoroTimer,
  usePomodoroTimer,
} from '../../lib/pomodoroTimer';
import { CardLabel } from '../CardLabel';

const BLOCKS = 10;

/**
 * Timer Pomodoro da sessao (Fase 36, secret/rascunhos/timer-pomodoro-sessao.md): manual (aluno
 * liga/desliga, sem relacao com Daily.Start/Resume/Complete), predefinicoes fixas, 100% client-side.
 *
 * Fase 68 (Figma "Daily — redesign proposto"): visual pixel art e SEM versao no menu - o menu e
 * global e unico, entao o antigo `PomodoroHeaderBadge` saiu. O timer continua rodando em
 * `lib/pomodoroTimer` (store modulo-level) quando o aluno sai da sessao e volta. O cartao cresce pra
 * ocupar a sobra da coluna (`flex-1`), com as secoes distribuidas na altura (`justify-between`).
 */
export function PomodoroWidget({ className = '' }: { className?: string }) {
  const timer = usePomodoroTimer();
  const isFocus = timer.phase === 'focus';
  const total = currentPhaseTotalSeconds(timer);
  const progress = total > 0 ? 1 - timer.remainingSeconds / total : 0;
  const filled = Math.round(progress * BLOCKS);

  return (
    <div className={`flex flex-col justify-between gap-3 pixel-box bg-base p-5 lg:short:gap-2 lg:short:p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <CardLabel pixel>Pomodoro</CardLabel>
        <span className={`font-pixel-label text-[8px] ${isFocus ? 'text-accent' : 'text-project'}`}>{isFocus ? 'Foco' : 'Pausa'}</span>
      </div>

      <p
        className={`text-center font-pixel text-6xl leading-none tabular-nums lg:tight:text-5xl ${isFocus ? 'text-primary' : 'text-project'} ${
          timer.justSwitchedPhase ? 'animate-pulse' : ''
        }`}
      >
        {formatPomodoroTime(timer.remainingSeconds)}
      </p>

      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: BLOCKS }, (_, i) => (
          <span key={i} className={`h-2 flex-1 ${i < filled ? (isFocus ? 'bg-accent' : 'bg-project') : 'bg-surface-alt'}`} />
        ))}
      </div>

      {timer.justSwitchedPhase && (
        <p className="text-center font-pixel text-lg leading-tight text-secondary">
          {isFocus ? 'Hora de focar de novo!' : 'Hora da pausa — estica as pernas.'}
        </p>
      )}

      <div className="flex gap-1.5">
        {POMODORO_PRESETS.map((preset, index) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => selectPomodoroPreset(index)}
            className={`flex-1 border-2 py-1.5 font-pixel-label text-[9px] ${
              index === timer.presetIndex ? 'border-accent text-accent' : 'border-stroke text-secondary hover:text-primary'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => (timer.isRunning ? pausePomodoroTimer() : startPomodoroTimer())}
          className="flex-1 border-2 border-accent py-2.5 font-pixel-label text-[10px] text-accent hover:bg-accent/10"
        >
          {timer.isRunning ? 'Pausar' : timer.started ? 'Continuar' : 'Iniciar'}
        </button>
        {timer.started && (
          <button
            type="button"
            onClick={resetPomodoroTimer}
            className="border-2 border-stroke px-3 py-2.5 font-pixel-label text-[10px] text-secondary hover:text-primary"
          >
            Zerar
          </button>
        )}
      </div>
    </div>
  );
}
