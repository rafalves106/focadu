import type { ReactNode } from 'react';
import { splitFences } from '../../lib/markdown';
import { DiagramBlock } from './DiagramBlock';

// Inline: "**negrito**" e "[texto](url)" - unica sintaxe inline suportada (Fase 29, Caderninho de
// Anotacoes: o aluno escreve negrito/link de verdade nas notas, ver secret/rascunhos/caderninho-
// de-anotacoes.md). A curadoria (Texto Cru) nunca usou essa sintaxe ate aqui, entao isso nao muda
// nada pro conteudo existente - so passa a reconhecer os 2 padroes se aparecerem.
const INLINE_PATTERN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const [, boldText, linkText, linkUrl] = match;
    if (boldText !== undefined) {
      nodes.push(<strong key={key++}>{boldText}</strong>);
    } else {
      nodes.push(
        <a key={key++} href={linkUrl} target="_blank" rel="noreferrer" className="text-accent underline">
          {linkText}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Renderiza um bloco de Texto Cru (markdown minimo - titulos "###"/"####", listas "- item", e
 * negrito/link inline dentro de paragrafos/itens, ver renderInline acima). Sem lib de markdown
 * (nenhuma no projeto) - so `#### Titulo` e `- item` viravam texto cru na tela (ver bug reportado
 * ao vivo), o resto ja era paragrafo simples de verdade.
 *
 * Fase 30: blocos cercados ("```") sao isolados ANTES do parser linha-a-linha (splitFences, ver
 * lib/markdown.ts - fence e multi-linha, nao da pra tratar no loop de baixo). "```diagrama" vira
 * um DiagramBlock (diagramas de fluxo simples, feedback do usuario de que texto corrido sem
 * referencia visual fica dificil de entender); qualquer outro "```" vira bloco de codigo
 * monoespacado simples (sem highlight de sintaxe - bonus de baixo custo por reaproveitar a mesma
 * deteccao de fence, ex: a requisicao HTTP crua do Dia 1).
 *
 * Compartilhado entre ReadingActivity (leitura da atividade), ContentPreviewModal (revisao via
 * sidebar, Fase 23) e o Caderninho de Anotacoes (Fase 29, notebook/) - mesmo Texto Cru, agora 3
 * lugares que precisam mostra-lo formatado (e, por extensao, os 3 ganham diagrama/bloco de codigo
 * de graca caso um aluno cole essa sintaxe numa nota pessoal - efeito esperado do componente
 * compartilhado, nao um caso especial).
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
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  for (const segment of splitFences(text)) {
    if (segment.kind === 'fence') {
      flushList();
      if (segment.lang === 'diagrama') {
        blocks.push(<DiagramBlock key={blocks.length} text={segment.text} />);
      } else {
        blocks.push(
          <pre
            key={blocks.length}
            className="overflow-x-auto rounded-xl border border-stroke bg-base p-4 font-mono text-[13px] leading-relaxed text-primary"
          >
            <code>{segment.text}</code>
          </pre>,
        );
      }
      continue;
    }

    for (const rawLine of segment.text.split('\n')) {
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
          {renderInline(line)}
        </p>,
      );
    }
  }
  flushList();

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
