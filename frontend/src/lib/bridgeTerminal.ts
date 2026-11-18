import { useSyncExternalStore } from 'react';
import { expectedTail } from './bridgeSteps';

/**
 * Terminal fixo da ponte intercalada (Fase 113, componente Ponte/Terminal `108:245`). Fica embaixo do editor a ponte
 * inteira: o que rodou num passo continua na tela no Prever e na voz seguintes, então vive aqui (módulo, por Daily) e
 * não no estado do passo, que é remontado a cada etapa. Some ao recarregar a página (só tela, nada vai pro servidor).
 *
 * Tons do Terminal/Linha: Comando apagado, Saída em texto primário, Erro em vermelho, Conferência em âmbar.
 */
export type TerminalTone = 'comando' | 'saida' | 'erro' | 'conferencia';

export interface TerminalLine {
  tone: TerminalTone;
  text: string;
}

const lines = new Map<string, TerminalLine[]>();
const listeners = new Set<() => void>();
const EMPTY: TerminalLine[] = [];

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBridgeTerminal(dailyId: string): TerminalLine[] {
  return useSyncExternalStore(subscribe, () => lines.get(dailyId) ?? EMPTY);
}

export function setBridgeTerminal(dailyId: string, next: TerminalLine[]) {
  lines.set(dailyId, next);
  emit();
}

/** Saída do programa: com erro (código diferente de zero), do traceback pra baixo em vermelho. */
export function outputLines(output: string, exitCode: number): TerminalLine[] {
  const body = output.replace(/\n+$/, '');
  const rows = body === '' ? [] : body.split('\n');
  if (exitCode === 0) return rows.map((text) => ({ tone: 'saida', text }));
  const start = rows.findIndex((r) => r.startsWith('Traceback') || /Error|Erro/.test(r));
  return rows.map((text, i) => ({ tone: start < 0 || i >= start ? 'erro' : 'saida', text }));
}

/**
 * A conferência da Focada (Corrigir, quadro `111:701`): a linha âmbar com o endereço trocado e a saída da 2ª execução,
 * linha a linha contra a esperada - a que saiu diferente vai em vermelho com o "esperado: …".
 */
export function checkLines(to: string, output: string, expected: string): TerminalLine[] {
  const got = output.replace(/\n+$/, '').split('\n');
  const want = expected.replace(/\n+$/, '').split('\n');
  const rows: TerminalLine[] = [{ tone: 'conferencia', text: `# conferência da Focada com ${to}` }];
  const total = Math.max(got.length, want.length);
  for (let i = 0; i < total; i++) {
    const g = got[i] ?? '';
    const w = want[i];
    if (w === undefined || g === w) rows.push({ tone: 'saida', text: g });
    else rows.push({ tone: 'erro', text: `${g || '(nada)'}   esperado: ${expectedTail(g, w)}` });
  }
  return rows;
}

/** A conferência bateu com a saída esperada (linha a linha, sem espaço no fim). */
export function checkPassed(output: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/\s+$/gm, '').replace(/\n+$/, '');
  return norm(output) === norm(expected);
}
