import { parseDiagram, type ComparisonPair, type DiagramStep } from '../../lib/markdown';

/**
 * Diagrama dentro do Texto Cru (bloco "```diagrama", Fase 30 - feedback do usuario de que texto
 * corrido sem referencia visual fica dificil de entender). 4 tipos desde a Fase 31 (usuario pediu
 * "tipos diferentes" depois de ver o tipo unico original) - "sequencia" (default, retrocompativel
 * com os blocos ja curados sem linha "tipo:"), "comparacao", "camadas" e "partes". Dispatch e
 * parsing em parseDiagram (lib/markdown.ts, nao aqui - mantem este arquivo so-componentes, regra
 * de lint react/only-export-components). Sem SVG em nenhum tipo - so flexbox/grid com os tokens
 * Tailwind ja existentes em index.css.
 */
export function DiagramBlock({ text }: { text: string }) {
  const data = parseDiagram(text);

  switch (data.kind) {
    case 'comparacao':
      return data.rows.length === 0 ? <EmptyDiagram /> : <ComparisonDiagram headers={data.headers} rows={data.rows} />;
    case 'camadas':
      return data.layers.length === 0 ? <EmptyDiagram /> : <LayersDiagram layers={data.layers} />;
    case 'partes':
      return data.parts.length === 0 ? <EmptyDiagram /> : <PartsDiagram parts={data.parts} />;
    default:
      return data.steps.length === 0 ? <EmptyDiagram /> : <SequenceDiagram steps={data.steps} />;
  }
}

function EmptyDiagram() {
  return (
    <p className="rounded-xl border border-stroke bg-base p-4 text-xs text-muted">
      Diagrama vazio ou com sintaxe inválida (ver secret/curadoria/CURADORIA.md seção 2.1).
    </p>
  );
}

/** Tipo "sequencia" (Fase 30) - cada passo vira uma linha empilhada "[origem] -> [destino]". Um unico layout serve tanto pro "ping-pong" entre 2 atores (three-way handshake) quanto pra uma cadeia linear de N atores (resolucao DNS). */
function SequenceDiagram({ steps }: { steps: DiagramStep[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-stroke bg-base p-4">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="w-5 shrink-0 font-mono text-[11px] text-muted">{i + 1}.</span>
          <Pill>{step.from}</Pill>
          <span className="shrink-0 text-sm text-accent">→</span>
          <Pill>{step.to}</Pill>
          {step.label && <span className="text-xs leading-[1.5] text-secondary">{step.label}</span>}
        </div>
      ))}
    </div>
  );
}

/** Tipo "comparacao" (Fase 31) - 2 colunas lado a lado (ex: RBAC vs ABAC), 1a linha do bloco vira o cabecalho de cada coluna. */
function ComparisonDiagram({ headers, rows }: { headers: ComparisonPair; rows: ComparisonPair[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stroke">
      <div className="grid grid-cols-2 divide-x divide-stroke bg-surface-alt">
        {headers.map((header, i) => (
          <p key={i} className="p-3 text-center text-xs font-semibold text-primary">
            {header}
          </p>
        ))}
      </div>
      <div className="divide-y divide-stroke bg-base">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-2 divide-x divide-stroke">
            {row.map((cell, j) => (
              <p key={j} className="p-3 text-xs leading-[1.5] text-secondary">
                {cell}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tipo "camadas" (Fase 31) - caixas empilhadas com indentacao crescente (1a linha = camada mais externa), ex: Defesa em Profundidade, cadeia PKI. */
function LayersDiagram({ layers }: { layers: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stroke bg-base p-4">
      {layers.map((layer, i) => (
        <div
          key={i}
          style={{ marginInline: i * 14 }}
          className="rounded-lg border border-stroke bg-surface-alt px-3 py-2 text-center text-xs font-medium text-primary"
        >
          {layer}
        </div>
      ))}
    </div>
  );
}

/** Tipo "partes" (Fase 31) - segmentos de UMA coisa so, lado a lado sem semantica causal (por isso "+" em vez de "->"), ex: Anatomia de uma Requisicao HTTP, estrutura de um JWT. */
function PartsDiagram({ parts }: { parts: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stroke bg-base p-4">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <span className="shrink-0 text-sm text-muted">+</span>}
          <Pill>{part}</Pill>
        </div>
      ))}
    </div>
  );
}

function Pill({ children }: { children: string }) {
  return <span className="rounded-full border border-stroke bg-surface-alt px-2.5 py-1 text-xs font-semibold text-primary">{children}</span>;
}
