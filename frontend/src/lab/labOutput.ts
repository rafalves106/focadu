import type { LabConfigDto, LabRuntime } from '../api/types';
import type { LabRunResult } from './labClient';

/** Fase 87: o que o passo ja sabe de uma execucao - vai junto do envio (`labRun`) e da dica. */
export interface LabRunRecord {
  output: string;
  exitCode: number;
  timedOut: boolean;
  aborted: boolean;
  ms: number;
  /** Linux: historico dos comandos digitados, com a saida de cada um. */
  commands?: { command: string; output: string; exitCode: number }[];
}

/**
 * Argumentos do programa a partir do comando de exemplo (`lab.command`): Python recebe `sys.argv` sem o
 * interpretador (`['auditor.py', 'ponte.pcap']`); JavaScript recebe `process.argv` inteiro
 * (`['node', 'auditor.mjs', 'ponte.pcap']`, o codigo le `process.argv[2]`).
 */
export function argvFor(runtime: LabRuntime, command: string): string[] {
  const tokens = command.trim().split(/\s+/);
  return runtime === 'javascript' ? tokens : tokens.slice(1);
}

/** Linha do erro na saida (traceback do Python, `line N:` do Bash, pilha do JavaScript) - ou null. */
export function errorLine(output: string, exitCode: number): number | null {
  if (exitCode === 0) return null;
  // Python ("line 15, in <module>") e Bash ("investigar.sh: line 3: ..."): a ultima linha citada e a do aluno.
  const named = [...output.matchAll(/line (\d+)/g)].at(-1);
  if (named) return Number(named[1]);
  // JavaScript: o quadro do codigo do aluno e o do Blob ("blob:http://.../uuid:LINHA:COLUNA").
  const blob = /blob:[^\s)]*?:(\d+):\d+/.exec(output);
  return blob ? Number(blob[1]) : null;
}

const RUNTIME_LABEL: Record<LabRuntime, string> = { python: 'PYTHON 3.12', javascript: 'JAVASCRIPT', bash: 'BASH 5.2' };

/** "PYTHON 3.12 · SCAPY" / "BASH 5.2 · IMAGEM SERVIDOR" - o chip do passo, sem o estado. */
export function runtimeLabel(lab: LabConfigDto): string {
  const parts: string[] = [RUNTIME_LABEL[lab.runtime]];
  if (lab.runtime === 'bash') parts.push(`IMAGEM ${lab.image === 'servidor' ? 'SERVIDOR' : 'BÁSICA'}`);
  for (const pkg of lab.packages) parts.push(pkg.toUpperCase());
  return parts.join(' · ');
}

export function toRecord(result: LabRunResult): LabRunRecord {
  return { output: result.output, exitCode: result.exitCode, timedOut: result.timedOut, aborted: result.aborted, ms: result.ms };
}

/** Texto que o aluno ve na saida: o que o programa imprimiu, mais o aviso se o laboratorio o derrubou. */
export function displayOutput(record: LabRunRecord, timeoutSeconds: number): string {
  const body = record.output.replace(/\n+$/, '');
  if (record.timedOut) return `${body ? `${body}\n` : ''}▲ passou de ${timeoutSeconds} s — parei o programa. Confira o while/for.`;
  if (record.aborted) return `${body ? `${body}\n` : ''}▲ você parou o programa.`;
  return body;
}

/** O payload de `labRun` da API a partir do que o laboratorio registrou. */
export function toPayload(record: LabRunRecord) {
  return {
    output: record.output,
    exitCode: record.exitCode,
    commands: record.commands?.map((c) => ({ command: c.command, output: c.output })),
  };
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(ms < 100 ? 2 : 1).replace('.', ',')} s`;
}

export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1).replace('.', ',')}`;
}
