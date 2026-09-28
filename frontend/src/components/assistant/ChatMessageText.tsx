import type { ReactNode } from 'react';
import { splitFences } from '../../lib/markdown';

/** Crase simples no meio da frase -> `<code>` (o miolo e sempre texto puro). */
function renderInlineCode(text: string): ReactNode[] {
  return text.split(/(`[^`\n]+`)/g).map((part, i) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="border border-stroke bg-base px-1 font-mono text-[12px] leading-none text-accent">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

/**
 * Texto de uma mensagem do chat rapido (Fase 79, pedido do dono: "o codigo fica estranho de ler sem
 * formatacao"): bloco cercado (```python ... ```) vira um quadro monoespacado com rolagem lateral, e
 * crase simples vira codigo inline. O resto continua texto corrido, com as quebras de linha da resposta.
 * Mesmo `splitFences` da leitura (lib/markdown.ts): bloco sem fechamento volta como texto.
 */
export function ChatMessageText({ text }: { text: string }) {
  return (
    <>
      {splitFences(text).map((segment, i) =>
        segment.kind === 'fence' ? (
          <pre
            key={i}
            // A coluna do chat e estreita (~200px): quebra a linha longa em vez de esconder o fim dela,
            // mantendo a indentacao (pre-wrap preserva os espacos do inicio).
            className="my-1 whitespace-pre-wrap border border-stroke bg-base px-2 py-1.5 font-mono text-[11px] leading-4 text-primary [overflow-wrap:anywhere]"
          >
            {segment.text}
          </pre>
        ) : (
          <span key={i} className="whitespace-pre-wrap">
            {renderInlineCode(segment.text.replace(/^\n+|\n+$/g, ''))}
          </span>
        ),
      )}
    </>
  );
}
