import { useEffect } from 'react';
import type { CodeCheckDto } from '../api/types';
import { runBridgeScript } from '../lab/bridgeRun';
import { useLab } from '../lab/labContext';
import { displayOutput, toRecord, type LabRunRecord } from '../lab/labOutput';
import { checkLines, checkPassed, outputLines, setBridgeTerminal, useBridgeTerminal, type TerminalLine } from './bridgeTerminal';
import { useSession } from './sessionContext';

export interface BridgeRun {
  record: LabRunRecord;
  /** Saída da conferência (2ª execução com a troca do codeCheck), quando o passo tem uma e a 1ª rodou sem erro. */
  checkOutput?: string;
  checkOk?: boolean;
}

/** "Python" para inspetor.py, "JavaScript" para .js/.mjs... - o rótulo do editor vem do arquivo, não do runtime (a ponte roda Python no Linux). */
export function languageOf(entry: string): string {
  if (/\.py$/.test(entry)) return 'Python';
  if (/\.m?js$/.test(entry)) return 'JavaScript';
  if (/\.sh$/.test(entry)) return 'Bash';
  if (/\.sql$/.test(entry)) return 'SQL';
  return 'Código';
}

/**
 * Fase 113: o laboratório da ponte intercalada. Sobe o lab do dia assim que a sessão abre (no celular também: a aba
 * Código roda o script, quadros `114:2537` e seguintes), roda o arquivo inteiro e grava o resultado no terminal fixo
 * (`bridgeTerminal`), com a conferência da Focada em seguida quando o passo tem uma.
 */
export function useBridgeRunner() {
  const { daily, weekly } = useSession();
  const { session, snapshot } = useLab();
  const lab = daily.lab ?? null;
  const lines: TerminalLine[] = useBridgeTerminal(daily.id);

  useEffect(() => {
    if (!lab || !weekly) return;
    session.ensure(lab, weekly.curatedContents).catch(() => undefined);
  }, [session, lab, weekly]);

  const ready = snapshot.status === 'ready';
  const running = snapshot.status === 'running';
  const pct = snapshot.progress && snapshot.progress.total > 0 ? Math.min(100, Math.round((snapshot.progress.loaded / snapshot.progress.total) * 100)) : null;
  const status =
    snapshot.status === 'error'
      ? `▲ o laboratório não iniciou${snapshot.error ? `: ${snapshot.error}` : ''}. Aperte Rodar pra tentar de novo.`
      : snapshot.status === 'loading' || snapshot.status === 'idle'
        ? `▲ preparando o laboratório${pct !== null ? ` · ${pct}%` : ''} (só na 1ª vez)`
        : running
          ? '▲ rodando…'
          : null;

  function retry() {
    if (!lab || !weekly) return;
    session.reset();
    session.ensure(lab, weekly.curatedContents).catch(() => undefined);
  }

  async function run(script: string, check?: CodeCheckDto | null): Promise<BridgeRun | null> {
    if (!lab) return null;
    if (snapshot.status === 'error') {
      retry();
      return null;
    }
    if (!ready) return null;
    const result = await runBridgeScript(session, lab, script);
    const record = toRecord(result);
    let next: TerminalLine[] = [{ tone: 'comando', text: `$ ${lab.command}` }, ...outputLines(displayOutput(record, lab.timeoutSeconds), record.exitCode)];
    let checkOutput: string | undefined;
    let checkOk: boolean | undefined;
    if (check && record.exitCode === 0 && !record.timedOut && !record.aborted) {
      const second = await runBridgeScript(session, lab, script.split(check.from).join(check.to));
      checkOutput = second.output;
      checkOk = second.exitCode === 0 && checkPassed(second.output, check.expectedOutput);
      next = [...next, ...checkLines(check.to, second.output, check.expectedOutput)];
    }
    setBridgeTerminal(daily.id, next);
    return { record, checkOutput, checkOk };
  }

  return { lab, lines, run, ready, running, status, language: lab ? languageOf(lab.entry) : 'Código' };
}
