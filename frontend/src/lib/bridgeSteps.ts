import { ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { sortedActivities } from './sessionSteps';

/**
 * Ponte intercalada (Fase 113; molde Foco dividido, docs/design/sistema.md §5; secret/processo/molde/ponte.md).
 * A ordem do dia diz tudo, sem campo novo: a 1ª Reading é a Abertura; cada Reading seguinte abre um bloco (3, 1 por
 * alvo); a última VoiceSummary é a voz final. Dentro do bloco: Reading = Explicação, Quiz = Prever, CodeStep = Fazer
 * (ou Corrigir, se tem linha marcada como erro), Parsons = Ordenar, VoiceSummary = Voz.
 */

export type BridgeSubStep = 'Explicação' | 'Prever' | 'Fazer' | 'Corrigir' | 'Ordenar' | 'Voz';

export interface BridgeLayout {
  opening: DailyActivityDto | null;
  blocks: DailyActivityDto[][];
  final: DailyActivityDto | null;
}

export function isInterleavedBridge(daily: DailyStateDto): boolean {
  return daily.bridgeFormat === 'intercalada';
}

export function isCodeActivity(activity: DailyActivityDto): boolean {
  return activity.type === ActivityType.CodeStep || activity.type === ActivityType.Parsons;
}

export function bridgeLayout(daily: DailyStateDto): BridgeLayout {
  const all = sortedActivities(daily);
  const blocks: DailyActivityDto[][] = [];
  all.forEach((a, i) => {
    if (i === 0) return;
    if (a.type === ActivityType.Reading) blocks.push([]);
    blocks.at(-1)?.push(a);
  });
  const lastBlock = blocks.at(-1);
  const final = lastBlock?.at(-1)?.type === ActivityType.VoiceSummary ? (lastBlock.pop() ?? null) : null;
  return { opening: all[0] ?? null, blocks, final };
}

export function subStepOf(activity: DailyActivityDto): BridgeSubStep {
  switch (activity.type) {
    case ActivityType.Reading:
      return 'Explicação';
    case ActivityType.Quiz:
      return 'Prever';
    case ActivityType.Parsons:
      return 'Ordenar';
    case ActivityType.VoiceSummary:
      return 'Voz';
    case ActivityType.CodeStep:
      return activity.codeStep?.marks?.some((m) => m.kind === 'Erro') ? 'Corrigir' : 'Fazer';
    default:
      return 'Fazer';
  }
}

export interface BridgePosition {
  /** 'abertura', 'bloco' (com `block` de 1 a 3) ou 'final'. */
  part: 'abertura' | 'bloco' | 'final';
  block: number | null;
  /** Etapas do bloco atual (vazio fora de bloco). */
  steps: DailyActivityDto[];
  stepIndex: number;
  subStep: BridgeSubStep | null;
  /** "Abertura", "Bloco 2 · Corrigir", "Voz final" - o fim do fio. */
  crumb: string;
}

export function bridgePosition(daily: DailyStateDto, activityId: string | null): BridgePosition {
  const layout = bridgeLayout(daily);
  if (!activityId || layout.opening?.id === activityId) {
    return { part: 'abertura', block: null, steps: [], stepIndex: -1, subStep: null, crumb: 'Abertura' };
  }
  if (layout.final?.id === activityId) return { part: 'final', block: null, steps: [], stepIndex: -1, subStep: null, crumb: 'Voz final' };
  const b = layout.blocks.findIndex((block) => block.some((a) => a.id === activityId));
  const steps = layout.blocks[b] ?? [];
  const stepIndex = steps.findIndex((a) => a.id === activityId);
  const subStep = stepIndex >= 0 ? subStepOf(steps[stepIndex]) : null;
  return { part: 'bloco', block: b + 1, steps, stepIndex, subStep, crumb: `Bloco ${b + 1}${subStep ? ` · ${subStep}` : ''}` };
}

/** Rótulo do sub-passo no cartão e na legenda do celular: "Bloco 1 · Prever · 2 de 4". */
export function bridgeCaption(position: BridgePosition): string {
  if (position.part !== 'bloco') return position.crumb;
  return `${position.crumb} · ${position.stepIndex + 1} de ${position.steps.length}`;
}

/** O trecho que uma atividade de código já entregou ao script (a tentativa aprovada ou a solução), ou nulo. */
export function deliveredCode(activity: DailyActivityDto): string | null {
  if (activity.type === ActivityType.Parsons) {
    const p = activity.parsons;
    if (!p?.done || !p.solution) return null;
    return [...p.fixedLines, ...p.solution].join('\n');
  }
  const step = activity.codeStep;
  if (!step?.done) return null;
  return (activity.responses.find((r) => r.passed)?.transcript ?? step.solution ?? '').replace(/\n+$/, '');
}

/** O script antes desta atividade de código (já sem o trecho que um passo "refaz" substitui). */
export function priorCodeOf(activity: DailyActivityDto): string | null {
  return activity.type === ActivityType.Parsons ? (activity.parsons?.priorCode ?? null) : (activity.codeStep?.priorCode ?? null);
}

export function joinCode(...parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => !!p && p.trim() !== '').map((p) => p.replace(/\n+$/, '')).join('\n\n');
}

export function lineTotal(code: string): number {
  return code === '' ? 0 : code.replace(/\n+$/, '').split('\n').length;
}

/**
 * O arquivo do dia como está antes de `activityId`: o que a última atividade de código ANTERIOR que já acabou
 * deixou. `closedLines` são as linhas dos blocos fechados (as que recolhem); daí pra frente é o bloco atual.
 */
export function bridgeFileBefore(daily: DailyStateDto, activityId: string | null): { code: string; closedLines: number } {
  const all = sortedActivities(daily);
  const index = activityId ? all.findIndex((a) => a.id === activityId) : all.length;
  const before = all.slice(0, index < 0 ? all.length : index);
  const lastDone = [...before].reverse().find((a) => isCodeActivity(a) && deliveredCode(a) !== null);
  const code = lastDone ? joinCode(priorCodeOf(lastDone), deliveredCode(lastDone)) : '';
  return { code, closedLines: closedLinesFor(daily, activityId) };
}

/**
 * Quantas linhas do arquivo são dos blocos já fechados: o script antes da 1ª atividade de código do bloco atual
 * (ou o arquivo inteiro na voz final). Zero no bloco 1 e quando o bloco atual ainda não chegou no código.
 */
export function closedLinesFor(daily: DailyStateDto, activityId: string | null): number {
  const layout = bridgeLayout(daily);
  const position = bridgePosition(daily, activityId);
  if (position.part === 'final') return 0;
  if (position.part !== 'bloco') return 0;
  const firstCode = position.steps.find(isCodeActivity);
  const prior = firstCode ? priorCodeOf(firstCode) : null;
  if (prior === null) {
    // O bloco ainda não abriu o código: o que está no arquivo é todo dos blocos anteriores.
    const previousBlocks = layout.blocks.slice(0, (position.block ?? 1) - 1).flat();
    const lastDone = [...previousBlocks].reverse().find((a) => isCodeActivity(a) && deliveredCode(a) !== null);
    return lastDone ? lineTotal(joinCode(priorCodeOf(lastDone), deliveredCode(lastDone))) : 0;
  }
  return lineTotal(prior);
}

/** Linha de comentário (Tom Comentário do Editor/Linha). */
export function isCommentLine(line: string): boolean {
  return /^\s*(#|\/\/|--)/.test(line);
}

/**
 * "código de status: 200" contra "código de status: 204" → "204": o pedaço do esperado depois do que as duas linhas
 * têm em comum (a linha de Conferência do terminal mostra só o que mudou).
 */
export function expectedTail(got: string, expected: string): string {
  let i = 0;
  while (i < got.length && i < expected.length && got[i] === expected[i]) i++;
  const cut = Math.max(expected.lastIndexOf(' ', i - 1) + 1, 0);
  return expected.slice(cut).trim() || expected;
}

/** "bloco 1" / "blocos 1 e 2" - a linha recolhida dos blocos fechados. */
export function closedBlocksLabel(block: number | null): string {
  if (!block || block <= 2) return 'bloco 1';
  const list = Array.from({ length: block - 1 }, (_, i) => i + 1);
  return `blocos ${list.slice(0, -1).join(', ')} e ${list.at(-1)}`;
}
