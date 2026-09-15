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
import { ProgressBar } from '../ProgressBar';

/**
 * Timer Pomodoro "de verdade" da sessao (Fase 36, secret/rascunhos/timer-pomodoro-sessao.md) - a
 * versao "design exclusivo" citada no rascunho, empilhada no sidebar de material junto de
 * MaterialSidebar/QuickNotePanel (ver useMaterialSidebar.tsx, mesmo padrao aditivo da Fase 29:
 * nenhuma funcionalidade existente e perdida, so acrescenta). A versao simplificada pro header
 * mora em PomodoroHeaderBadge - ambas leem o mesmo `lib/pomodoroTimer` (store modulo-level), entao
 * continuam sincronizadas ao navegar pra fora da sessao (ex: Caderninho) e voltar.
 *
 * Manual de proposito (aluno liga/desliga, sem relacao com Daily.Start/Resume/Complete) e com
 * predefinicoes fixas em vez de duracao livre - decisoes do Falves fechando as perguntas em aberto
 * do rascunho antes de implementar.
 *
 * `flex-1` (Fase 37, pedido explicito) - antes ficava do tamanho do proprio conteudo, com o vao
 * sobrando empilhado ACIMA dele (justify-between em useMaterialSidebar.tsx); reportado como "esse
 * card podia ocupar esse espaco" - agora e o proprio card (borda incluida) que cresce pra
 * preencher a coluna. `justify-between` (era `justify-center`, mesmo pedido: "os cronogramas
 * possiveis [= os presets] ficarem espacados corretamente") distribui as secoes internas
 * (cabecalho, digitos, barra de progresso, presets, botoes) pela altura extra toda, em vez de
 * deixa-las todas juntas centralizadas com vao morto so em cima/embaixo do bloco inteiro.
 */
export function PomodoroWidget() {
  const timer = usePomodoroTimer();
  const isFocus = timer.phase === 'focus';
  const total = currentPhaseTotalSeconds(timer);
  const progress = total > 0 ? 1 - timer.remainingSeconds / total : 0;

  return (
    <div className="flex w-[280px] flex-1 flex-col justify-between gap-3 rounded-2xl border border-stroke bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Pomodoro</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            isFocus ? 'bg-accent/25 text-accent' : 'bg-project/25 text-project'
          }`}
        >
          {isFocus ? 'Foco' : 'Pausa'}
        </span>
      </div>

      <p
        className={`text-center text-4xl font-bold tabular-nums ${isFocus ? 'text-primary' : 'text-project'} ${
          timer.justSwitchedPhase ? 'animate-pulse' : ''
        }`}
      >
        {formatPomodoroTime(timer.remainingSeconds)}
      </p>

      <ProgressBar progress={progress} tone={isFocus ? 'accent' : 'project'} />

      {timer.justSwitchedPhase && (
        <p className="text-center text-xs font-medium text-secondary">
          {isFocus ? '⏱️ Hora de focar de novo!' : '☕ Hora da pausa — esticar as pernas.'}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {POMODORO_PRESETS.map((preset, index) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => selectPomodoroPreset(index)}
            className={
              index === timer.presetIndex
                ? 'rounded-full border border-accent bg-accent/25 px-2.5 py-1 text-[11px] font-semibold text-primary'
                : 'rounded-full border border-stroke bg-surface-alt px-2.5 py-1 text-[11px] font-medium text-secondary hover:border-accent/50'
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => (timer.isRunning ? pausePomodoroTimer() : startPomodoroTimer())}
          className="flex-1 rounded-xl bg-accent py-2 text-sm font-bold tracking-wide text-base"
        >
          {timer.isRunning ? 'Pausar' : timer.started ? 'Continuar' : 'Iniciar'}
        </button>
        {timer.started && (
          <button
            type="button"
            onClick={resetPomodoroTimer}
            className="rounded-xl border border-stroke px-3 py-2 text-sm font-medium text-secondary hover:text-primary"
          >
            Zerar
          </button>
        )}
      </div>
    </div>
  );
}
