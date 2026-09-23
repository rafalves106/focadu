/**
 * Configuracoes locais do usuario (Fase 7, tornado real em 2026-08-28) - so `localStorage`, sem
 * backend: nao ha necessidade de sincronizar entre dispositivos pra um valor tao pequeno. Usado
 * por SettingsMenu (edicao) e VoiceSummaryActivity (leitura, limite de gravacao real).
 *
 * Fase 64: "Sons da interface" (liga/desliga + volume) - por enquanto so os sons do dialogo da
 * Focada (lib/uiSound.ts). O bipe de fim de ciclo do Pomodoro NAO obedece isso de proposito: e um
 * alarme funcional, silenciar ele junto seria surpresa ruim.
 */
const RECORDING_LIMIT_KEY = 'focadu:recordingLimitMinutes';
export const RECORDING_LIMIT_OPTIONS = [5, 10, 15] as const;
const DEFAULT_RECORDING_LIMIT_MINUTES = 10;

export function getRecordingLimitMinutes(): number {
  const raw = Number(localStorage.getItem(RECORDING_LIMIT_KEY));
  return RECORDING_LIMIT_OPTIONS.includes(raw as (typeof RECORDING_LIMIT_OPTIONS)[number])
    ? raw
    : DEFAULT_RECORDING_LIMIT_MINUTES;
}

export function setRecordingLimitMinutes(minutes: number): void {
  localStorage.setItem(RECORDING_LIMIT_KEY, String(minutes));
}

const UI_SOUND_ENABLED_KEY = 'focadu:uiSoundEnabled';
const UI_SOUND_VOLUME_KEY = 'focadu:uiSoundVolume';
const DEFAULT_UI_SOUND_VOLUME = 0.5;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Armazenamento indisponivel (aba privada/bloqueado) - a preferencia so nao persiste.
  }
}

export function getUiSoundEnabled(): boolean {
  return safeGet(UI_SOUND_ENABLED_KEY) !== 'false';
}

export function setUiSoundEnabled(enabled: boolean): void {
  safeSet(UI_SOUND_ENABLED_KEY, String(enabled));
}

/** Volume de 0 a 1. */
export function getUiSoundVolume(): number {
  const raw = safeGet(UI_SOUND_VOLUME_KEY);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : DEFAULT_UI_SOUND_VOLUME;
}

export function setUiSoundVolume(volume: number): void {
  safeSet(UI_SOUND_VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}
