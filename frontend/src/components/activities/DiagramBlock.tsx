import { parseDiagramSteps } from '../../lib/markdown';

/**
 * Diagrama de fluxo simples (bloco "```diagrama" dentro do Texto Cru, Fase 30 - feedback do
 * usuario de que texto corrido sem referencia visual fica dificil de entender, ex: three-way
 * handshake do TCP e cadeia de resolucao DNS do Dia 1). Cada passo vira uma linha empilhada
 * "[origem] -> [destino]: rotulo" (parseDiagramSteps, lib/markdown.ts) - um unico layout serve
 * tanto pro "ping-pong" entre 2 atores (handshake) quanto pra uma cadeia linear de N atores
 * (resolucao DNS), sem SVG (nenhuma lib de diagrama no projeto - so flexbox/Tailwind com os
 * tokens ja existentes em index.css).
 */
export function DiagramBlock({ text }: { text: string }) {
  const steps = parseDiagramSteps(text);

  if (steps.length === 0) {
    return (
      <p className="rounded-xl border border-stroke bg-base p-4 text-xs text-muted">
        Diagrama vazio ou com sintaxe inválida (nenhum passo "origem -&gt; destino" reconhecido).
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-stroke bg-base p-4">
      {steps.map((step, i) => (
        <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="w-5 shrink-0 font-mono text-[11px] text-muted">{i + 1}.</span>
          <span className="rounded-full border border-stroke bg-surface-alt px-2.5 py-1 text-xs font-semibold text-primary">
            {step.from}
          </span>
          <span className="shrink-0 text-sm text-accent">→</span>
          <span className="rounded-full border border-stroke bg-surface-alt px-2.5 py-1 text-xs font-semibold text-primary">
            {step.to}
          </span>
          {step.label && <span className="text-xs leading-[1.5] text-secondary">{step.label}</span>}
        </div>
      ))}
    </div>
  );
}
