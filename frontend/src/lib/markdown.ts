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
 * Parser do DSL de diagrama de fluxo (bloco "```diagrama", Fase 30 - ver secret/curadoria/
 * CURADORIA.md secao 2.1). Usado por DiagramBlock.tsx - fica aqui (nao dentro do componente) pra
 * manter esse arquivo so-componentes (regra de lint react/only-export-components), mesma
 * separacao ja usada pelo resto de lib/markdown.ts. Linha em branco ou que nao bate no padrao e
 * silenciosamente ignorada - mesma filosofia do resto do MarkdownBlock (sintaxe invalida nunca
 * quebra o render, so nao vira nada).
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
