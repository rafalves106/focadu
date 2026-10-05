/**
 * Bloco de troca HTTP no Texto Cru ("```requisicao" / "```resposta"): feedback do dono de que
 * requisicao e resposta em 2 caixas de codigo iguais nao deixavam claro o que vai e o que volta.
 * Faixa no topo diz a direcao; requisicao (accent) encosta a esquerda, resposta (project) a
 * direita, como numa conversa. Figma: "Bloco de troca HTTP" (node 238:8733).
 */
import type { HttpExchangeKind } from '../../lib/markdown';

const VARIANTS: Record<HttpExchangeKind, { arrow: string; label: string; align: string; border: string; band: string }> = {
  requisicao: {
    arrow: '▶',
    label: 'Navegador → Servidor · Requisição',
    align: 'mr-auto',
    border: 'border-accent',
    band: 'bg-accent',
  },
  resposta: {
    arrow: '◀',
    label: 'Servidor → Navegador · Resposta',
    align: 'ml-auto',
    border: 'border-project',
    band: 'bg-project',
  },
};

export function HttpExchangeBlock({ kind, text }: { kind: HttpExchangeKind; text: string }) {
  const v = VARIANTS[kind];
  return (
    <figure className={`w-full max-w-[82%] border-2 bg-base ${v.border} ${v.align}`}>
      <figcaption className={`px-3 py-1 font-pixel-label text-xs uppercase text-[var(--color-base)] ${v.band}`}>
        <span className="font-sans font-bold">{v.arrow}</span> {v.label}
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-primary">
        <code>{text}</code>
      </pre>
    </figure>
  );
}
