/**
 * Configuracoes locais do usuario (Fase 7, tornado real em 2026-08-28) - so `localStorage`, sem
 * backend: nao ha necessidade de sincronizar entre dispositivos pra um valor tao pequeno. Usado
 * por SettingsMenu (edicao) e VoiceSummaryActivity (leitura, limite de gravacao real).
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
