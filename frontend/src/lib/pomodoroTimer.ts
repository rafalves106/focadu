import { useSyncExternalStore } from 'react';

export type PomodoroPhase = 'focus' | 'break';

export interface PomodoroPreset {
  label: string;
  focusMinutes: number;
  breakMinutes: number;
}

/**
 * Fase 36 (secret/rascunhos/timer-pomodoro-sessao.md): predefinicoes fixas em vez de um campo de
 * duracao livre - decisao do Falves ("configuravel de forma basica com predefinicoes direto no
 * visualizador dele, pra ser algo mais simples de mexer"). 25/5 classico e o padrao inicial.
 */
export const POMODORO_PRESETS: PomodoroPreset[] = [
  { label: '25 / 5', focusMinutes: 25, breakMinutes: 5 },
  { label: '50 / 10', focusMinutes: 50, breakMinutes: 10 },
  { label: '15 / 3', focusMinutes: 15, breakMinutes: 3 },
];

export interface PomodoroState {
  presetIndex: number;
  phase: PomodoroPhase;
  remainingSeconds: number;
  isRunning: boolean;
  /** true assim que o aluno da play a 1a vez - so entao `PomodoroHeaderBadge` aparece no header
   * (mesma logica de "esconder quando nao ha nada relevante" de `dailyPenaltyContext`, so que aqui
   * via bool em vez de `null`). `resetPomodoroTimer` volta a false (some do header de novo). */
  started: boolean;
  /** Pulsa por alguns segundos logo apos o fim de um ciclo (troca foco<->pausa) - widget e badge
   * usam isso pra destacar visualmente a troca, alem do bipe sonoro (ver playChime). */
  justSwitchedPhase: boolean;
}

/**
 * Timer Pomodoro (Fase 36) - store modulo-level via `useSyncExternalStore`, mesmo padrao de
 * `dailyPenaltyContext`/`studyAssistantContext`: `PomodoroWidget` (sessao, ver useMaterialSidebar)
 * e `PomodoroHeaderBadge` (GlobalNav) leem o mesmo estado sem precisar de um Context Provider
 * novo, e o `setInterval` proprio (nao preso a nenhum useEffect de componente) continua contando
 * mesmo se o aluno navegar pra fora da sessao (ex: checar o Caderninho) e so a versao do header
 * ficar montada - decisao do rascunho ("o timer do header precisa continuar contando").
 *
 * Decisoes do Falves (perguntas em aberto do rascunho, todas fechadas antes de implementar):
 * manual (aluno liga/desliga, sem relacao com Daily.Start/Resume/Complete); predefinicoes fixas;
 * fim de ciclo tem bipe + destaque visual (nunca so troca caladamente); 100% client-side/cosmetico
 * - sem endpoint novo, sem Gems, reseta se a aba fechar.
 */
function phaseSeconds(preset: PomodoroPreset, phase: PomodoroPhase): number {
  return (phase === 'focus' ? preset.focusMinutes : preset.breakMinutes) * 60;
}

function initialState(): PomodoroState {
  return {
    presetIndex: 0,
    phase: 'focus',
    remainingSeconds: phaseSeconds(POMODORO_PRESETS[0], 'focus'),
    isRunning: false,
    started: false,
    justSwitchedPhase: false,
  };
}

let state: PomodoroState = initialState();
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let switchFlashTimeoutId: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<PomodoroState>) {
  state = { ...state, ...patch };
  emit();
}

function syncInterval() {
  if (state.isRunning && !intervalId) {
    intervalId = setInterval(tick, 1000);
  } else if (!state.isRunning && intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function tick() {
  if (state.remainingSeconds > 1) {
    setState({ remainingSeconds: state.remainingSeconds - 1 });
    return;
  }

  // Fim do ciclo - troca de fase automaticamente e continua rodando (foco -> pausa -> foco -> ...),
  // com bipe + destaque visual (nunca so troca caladamente, decisao do Falves).
  const nextPhase: PomodoroPhase = state.phase === 'focus' ? 'break' : 'focus';
  const preset = POMODORO_PRESETS[state.presetIndex];
  setState({ phase: nextPhase, remainingSeconds: phaseSeconds(preset, nextPhase), justSwitchedPhase: true });
  playChime(nextPhase);

  if (switchFlashTimeoutId) clearTimeout(switchFlashTimeoutId);
  switchFlashTimeoutId = setTimeout(() => setState({ justSwitchedPhase: false }), 5000);
}

export function startPomodoroTimer() {
  getAudioContext(); // "Desbloqueia" o audio neste gesto do usuario - bipes automaticos depois (fora de um clique direto) reaproveitam o mesmo contexto ja liberado.
  setState({ isRunning: true, started: true });
  syncInterval();
}

export function pausePomodoroTimer() {
  setState({ isRunning: false });
  syncInterval();
}

/** Reseta pra fase de foco do preset atual, parado - some do header de novo (`started` volta a false). */
export function resetPomodoroTimer() {
  if (switchFlashTimeoutId) {
    clearTimeout(switchFlashTimeoutId);
    switchFlashTimeoutId = null;
  }
  const preset = POMODORO_PRESETS[state.presetIndex];
  setState({
    phase: 'focus',
    remainingSeconds: phaseSeconds(preset, 'focus'),
    isRunning: false,
    started: false,
    justSwitchedPhase: false,
  });
  syncInterval();
}

/** Troca de predefinicao - sempre reinicia parado na fase de foco, pra nao deixar uma contagem em
 * andamento (ex: pausa de 5min) incoerente com a duracao do preset novo (ex: 50/10). */
export function selectPomodoroPreset(presetIndex: number) {
  if (presetIndex === state.presetIndex) return;
  const preset = POMODORO_PRESETS[presetIndex];
  if (!preset) return;

  if (switchFlashTimeoutId) {
    clearTimeout(switchFlashTimeoutId);
    switchFlashTimeoutId = null;
  }
  setState({
    presetIndex,
    phase: 'focus',
    remainingSeconds: phaseSeconds(preset, 'focus'),
    isRunning: false,
    justSwitchedPhase: false,
  });
  syncInterval();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function usePomodoroTimer(): PomodoroState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function currentPhaseTotalSeconds(snapshot: PomodoroState): number {
  return phaseSeconds(POMODORO_PRESETS[snapshot.presetIndex], snapshot.phase);
}

export function formatPomodoroTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- Som (Fase 36): bipe curto via Web Audio API em vez de um asset de audio novo no repo - 2 tons
// subindo (pausa -> foco, "energiza") ou descendo (foco -> pausa, "relaxa").
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function playChime(nextPhase: PomodoroPhase) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const freqs = nextPhase === 'break' ? [880, 660] : [660, 880];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}
