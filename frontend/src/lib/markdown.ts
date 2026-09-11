/**
 * Remove a linha "### <titulo>" inicial de um Texto Cru quando ela so repete o `CuratedContent.
 * title` que o chamador ja mostra separado (h1 proprio) - convencao confirmada nos 20 dia-N.json
 * de curadoria (a 1a linha "###" sempre repete o titulo ipsis litteris). So corta quando bate
 * exatamente - nao mexe em nada se o texto nao seguir essa convencao.
 */
export function stripRedundantTitleHeading(bodyText: string, title: string): string {
  const match = bodyText.trimStart().match(/^###\s+(.+?)\s*(?:\n|$)/);
  if (!match || match[1].trim() !== title.trim()) return bodyText;
  return bodyText.trimStart().slice(match[0].length);
}

export interface ProseSegment {
  kind: 'prose';
  text: string;
}
export interface FenceSegment {
  kind: 'fence';
  lang: string;
  text: string;
}
export type MarkdownSegment = ProseSegment | FenceSegment;

const FENCE_LINE = /^```\s*([\w-]*)\s*$/;

/**
 * Pre-passo pra isolar blocos cercados ("```" ... "```", ex: "```diagrama" - Fase 30, diagramas de
 * fluxo simples) do resto do Texto Cru. Fences sao multi-linha, entao precisam ser reconhecidos
 * ANTES de qualquer parser linha-a-linha (MarkdownBlock.tsx) ou contagem de palavras
 * (ReadingActivity.tsx, via stripFencedBlocks abaixo) - os 2 consumidores precisam da MESMA nocao
 * do que conta como fence, por isso mora aqui e nao dentro do MarkdownBlock. Fence nunca fechado
 * ate o fim do texto cai de volta como prosa (nunca descarta conteudo por um "```" esquecido).
 */
export function splitFences(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let proseLines: string[] = [];
  let fenceLines: string[] = [];
  let fenceLang = '';
  let inFence = false;

  const flushProse = () => {
    if (proseLines.length > 0) segments.push({ kind: 'prose', text: proseLines.join('\n') });
    proseLines = [];
  };

  for (const line of text.split('\n')) {
    const fenceMatch = line.match(FENCE_LINE);
    if (fenceMatch && !inFence) {
      flushProse();
      inFence = true;
      fenceLang = fenceMatch[1].toLowerCase();
      fenceLines = [];
    } else if (fenceMatch && inFence) {
      segments.push({ kind: 'fence', lang: fenceLang, text: fenceLines.join('\n') });
      inFence = false;
    } else if (inFence) {
      fenceLines.push(line);
    } else {
      proseLines.push(line);
    }
  }

  if (inFence) proseLines.push(...fenceLines); // "```" sem fechamento - devolve como prosa, nunca descarta.
  flushProse();
  return segments;
}

/** Remove o conteudo de dentro de blocos cercados - usado no calculo de tempo de leitura (ReadingActivity): a sintaxe do DSL de diagrama nao e prosa "lida". */
export function stripFencedBlocks(text: string): string {
  return splitFences(text)
    .filter((segment): segment is ProseSegment => segment.kind === 'prose')
    .map((segment) => segment.text)
    .join('\n');
}

export interface DiagramStep {
  from: string;
  to: string;
  label?: string;
}

// "Origem -> Destino: rotulo opcional" - um hop por linha, nunca encadear "A -> B -> C" na mesma linha.
const DIAGRAM_STEP_LINE = /^(.+?)\s*->\s*([^:]+?)(?:\s*:\s*(.+))?$/;

/**
 * Parser do DSL de diagrama de fluxo/sequencia - "sequencia" e o tipo default de diagrama (Fase
 * 30, ver parseDiagram abaixo pra como os outros tipos foram somados na Fase 31). Linha em branco
 * ou que nao bate no padrao e silenciosamente ignorada - mesma filosofia do resto do
 * MarkdownBlock (sintaxe invalida nunca quebra o render, so nao vira nada).
 */
export function parseDiagramSteps(text: string): DiagramStep[] {
  const steps: DiagramStep[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(DIAGRAM_STEP_LINE);
    if (!match) continue;
    const [, from, to, label] = match;
    steps.push({ from: from.trim(), to: to.trim(), label: label?.trim() });
  }
  return steps;
}

export type ComparisonPair = [left: string, right: string];

export type DiagramData =
  | { kind: 'sequencia'; steps: DiagramStep[] }
  | { kind: 'comparacao'; headers: ComparisonPair; rows: ComparisonPair[] }
  | { kind: 'camadas'; layers: string[] }
  | { kind: 'partes'; parts: string[] };

const DIAGRAM_TYPE_LINE = /^tipo:\s*(sequencia|comparacao|camadas|partes)\s*$/i;

function nonEmptyLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** "esquerda | direita" - descarta a linha se nao tiver exatamente 1 "|" (mesma filosofia de sintaxe invalida = ignorada, nao quebra o render). */
function splitComparisonPair(line: string): ComparisonPair | null {
  const parts = line.split('|');
  if (parts.length !== 2) return null;
  return [parts[0].trim(), parts[1].trim()];
}

/** 1a linha = cabecalho das 2 colunas, demais = linhas de comparacao. Vazio (`rows`) quando ha menos de 2 linhas validas - o chamador decide como mostrar isso vazio. */
function parseComparison(text: string): { headers: ComparisonPair; rows: ComparisonPair[] } {
  const pairs = nonEmptyLines(text)
    .map(splitComparisonPair)
    .filter((pair): pair is ComparisonPair => pair !== null);
  const [headers, ...rows] = pairs;
  return { headers: headers ?? ['', ''], rows: headers ? rows : [] };
}

/**
 * Dispatcher do DSL de diagrama (bloco "```diagrama", Fase 30 - 4 tipos desde a Fase 31, feedback
 * do usuario pedindo "tipos diferentes"). Fica aqui, nao dentro de DiagramBlock.tsx, pra manter
 * aquele arquivo so-componentes (regra de lint react/only-export-components).
 *
 * A 1a linha nao-vazia do bloco, se for "tipo: <nome>", escolhe o tipo e e consumida; sem essa
 * linha, o tipo e "sequencia" (Fase 30, retrocompativel - os 2 diagramas ja curados no Dia 1 nao
 * tem essa linha e continuam funcionando sem edicao). Ver secret/curadoria/CURADORIA.md secao 2.1
 * pra sintaxe completa e exemplos de cada tipo.
 */
export function parseDiagram(text: string): DiagramData {
  const lines = text.split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim() !== '');
  const typeMatch = firstNonEmptyIndex >= 0 ? lines[firstNonEmptyIndex].trim().match(DIAGRAM_TYPE_LINE) : null;

  if (!typeMatch) return { kind: 'sequencia', steps: parseDiagramSteps(text) };

  const body = lines.slice(firstNonEmptyIndex + 1).join('\n');
  switch (typeMatch[1].toLowerCase()) {
    case 'comparacao':
      return { kind: 'comparacao', ...parseComparison(body) };
    case 'camadas':
      return { kind: 'camadas', layers: nonEmptyLines(body) };
    case 'partes':
      return { kind: 'partes', parts: nonEmptyLines(body) };
    default:
      return { kind: 'sequencia', steps: parseDiagramSteps(body) };
  }
}
