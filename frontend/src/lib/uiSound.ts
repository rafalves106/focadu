import { getUiSoundEnabled, getUiSoundVolume } from './settings';

/**
 * Sons da interface (Fase 64) - sintetizados na hora com Web Audio (onda quadrada curta, o "blip"
 * de jogo 8-bit), sem arquivo de audio nenhum pra carregar. Obedecem "Sons da interface" nas
 * Configuracoes (liga/desliga + volume, lib/settings.ts). Sem voz: a Focada so fala por texto.
 */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  // Navegador so libera o audio depois de um gesto do usuario - o 1o blip pode sair mudo, sem erro.
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(frequency: number, durationMs: number, gainScale: number, delayMs = 0): void {
  if (!getUiSoundEnabled()) return;
  const volume = getUiSoundVolume() * gainScale;
  if (volume <= 0) return;
  const ctx = audio();
  if (!ctx) return;

  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.02);
}

/** Blip de digitacao - curto e baixo, toca a cada poucas letras. */
export function playTypingBlip(): void {
  tone(660 + Math.random() * 80, 28, 0.08);
}

/** Avancar fala - dois tons subindo. */
export function playAdvance(): void {
  tone(520, 45, 0.12);
  tone(780, 60, 0.12, 45);
}
