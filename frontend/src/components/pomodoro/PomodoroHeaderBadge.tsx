import { formatPomodoroTime, pausePomodoroTimer, startPomodoroTimer, usePomodoroTimer } from '../../lib/pomodoroTimer';

/**
 * Versao compacta do timer Pomodoro pro header (Fase 36, GlobalNav, secret/rascunhos/timer-
 * pomodoro-sessao.md) - so acompanhamento visual, sem competir em destaque com PenaltyHeaderBadge/
 * AiStatusBadge/HeaderUserBadge (mesmo grupo). Mesma fonte de estado que `PomodoroWidget` (a versao
 * "design exclusivo" da sessao) via `lib/pomodoroTimer` - continuam sincronizados ao navegar pra
 * fora da sessao (ex: Caderninho) e voltar.
 *
 * So aparece depois que o aluno da play pela 1a vez (`timer.started`) - nao polui o header de quem
 * nunca usa o timer, mesma logica de "esconder quando nao ha nada relevante" de PenaltyHeaderBadge.
 * Clicavel: da play/pausa direto do header, sem precisar voltar pra tela da sessao.
 */
export function PomodoroHeaderBadge() {
  const timer = usePomodoroTimer();
  if (!timer.started) return null;

  const isFocus = timer.phase === 'focus';

  return (
    <button
      type="button"
      onClick={() => (timer.isRunning ? pausePomodoroTimer() : startPomodoroTimer())}
      aria-label={timer.isRunning ? 'Pausar Pomodoro' : 'Retomar Pomodoro'}
      title={isFocus ? 'Pomodoro — Foco' : 'Pomodoro — Pausa'}
      className={`flex items-center gap-1.5 rounded-full border border-stroke bg-surface-alt py-1 pl-2 pr-2.5 hover:border-accent/50 ${
        timer.justSwitchedPhase ? 'animate-pulse' : ''
      }`}
    >
      <span className="text-sm leading-none" aria-hidden="true">
        {isFocus ? '🍅' : '☕'}
      </span>
      <span className={`text-xs font-bold tabular-nums ${isFocus ? 'text-accent' : 'text-project'}`}>
        {formatPomodoroTime(timer.remainingSeconds)}
      </span>
      {!timer.isRunning && (
        <span className="text-[10px] text-muted" aria-hidden="true">
          ⏸
        </span>
      )}
    </button>
  );
}
