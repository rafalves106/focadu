import type { ReactNode } from 'react';

/**
 * Renderiza um bloco de Texto Cru (markdown minimo, so o que a curadoria de fato usa - ver
 * CURADORIA.md: titulos "###"/"####" e listas "- item", nunca negrito/link/etc). Sem lib de
 * markdown (nenhuma no projeto) - so `#### Titulo` e `- item` viravam texto cru na tela (ver bug
 * reportado ao vivo), o resto ja era paragrafo simples de verdade.
 *
 * Compartilhado entre ReadingActivity (leitura da atividade) e ContentPreviewModal (revisao via
 * sidebar, Fase 23) - mesmo Texto Cru, 2 lugares que precisam mostra-lo formatado.
 */
export function MarkdownBlock({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={blocks.length} className="ml-4 list-disc space-y-1.5">
        {listItems.map((item, i) => (
          <li key={i} className="text-sm leading-[1.5] text-secondary">
            {item}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    const subsection = line.match(/^####\s+(.+)/);
    if (subsection) {
      flushList();
      blocks.push(
        <h3 key={blocks.length} className="text-lg font-semibold text-primary">
          {subsection[1]}
        </h3>,
      );
      continue;
    }

    const title = line.match(/^###\s+(.+)/);
    if (title) {
      flushList();
      blocks.push(
        <h2 key={blocks.length} className="text-xl font-bold text-primary">
          {title[1]}
        </h2>,
      );
      continue;
    }

    const bullet = line.match(/^-\s+(.+)/);
    if (bullet) {
      listItems.push(bullet[1]);
      continue;
    }

    flushList();
    blocks.push(
      <p key={blocks.length} className="text-sm leading-[1.5] text-secondary">
        {line}
      </p>,
    );
  }
  flushList();

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
