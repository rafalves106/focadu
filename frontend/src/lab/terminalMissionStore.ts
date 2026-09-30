import { useSyncExternalStore } from 'react';
import type { TerminalEntry } from '../components/code/labParts';

/** O que a faixa de conferencia abaixo do terminal mostra. */
export type MissionStrip = { kind: 'idle' } | { kind: 'ok' } | { kind: 'notfound' } | { kind: 'miss' } | { kind: 'hint'; text: string };

/**
 * Progresso das missoes de UMA atividade, em memoria. O Linux do laboratorio tambem vive so na sessao (recarregar a
 * pagina o recria do zero), entao guardar isto fora do componente - que remonta a cada etapa - basta: o aluno que
 * volta pra etapa anterior e retorna encontra o terminal e as missoes como deixou. Nada vai pro servidor; ele so
 * recebe a conclusao da atividade.
 */
export interface MissionProgress {
  /** Por missao: o comando com que foi cumprida (null = ainda nao). */
  passedWith: (string | null)[];
  /** Missao em tela (0-based). */
  viewing: number;
  /** Quantas dicas ja foram abertas em cada missao. */
  hintsShown: number[];
  entries: TerminalEntry[];
  strip: MissionStrip;
}

const store = new Map<string, MissionProgress>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function fresh(count: number, allDone: boolean): MissionProgress {
  return {
    passedWith: Array.from({ length: count }, () => (allDone ? '' : null)),
    viewing: allDone ? count - 1 : 0,
    hintsShown: Array.from({ length: count }, () => 0),
    entries: [],
    strip: allDone ? { kind: 'ok' } : { kind: 'idle' },
  };
}

/** Estado das missoes da atividade; nasce na primeira leitura (`allDone`: a atividade ja foi concluida antes). */
export function useMissionProgress(activityId: string, count: number, allDone: boolean): MissionProgress {
  return useSyncExternalStore(subscribe, () => {
    let progress = store.get(activityId);
    if (!progress || progress.passedWith.length !== count) {
      progress = fresh(count, allDone);
      store.set(activityId, progress);
    }
    return progress;
  });
}

export function updateMissionProgress(activityId: string, patch: (current: MissionProgress) => MissionProgress): void {
  const current = store.get(activityId);
  if (!current) return;
  store.set(activityId, patch(current));
  for (const listener of listeners) listener();
}
