import type { ReactNode } from 'react';
import { splitFences } from '../../lib/markdown';
import { DiagramBlock } from './DiagramBlock';

// Inline: "**negrito**", "*italico*", "`codigo`" e "[texto](url)" - unica sintaxe inline suportada
// (Fase 29, Caderninho de Anotacoes: o aluno escreve negrito/link de verdade nas notas, ver
// secret/rascunhos/caderninho-de-anotacoes.md). O italico entrou na Fase 51: a leitura reescrita
// pelo agente editor-pedagogico-websec passou a usar "*sigla*" em centenas de trechos e o asterisco
// aparecia literal na tela.
//
// O italico e mais restrito que o CommonMark de proposito: o texto curado tem muito "*" que NAO e
// enfase (wildcard "*.exemplo.com", "SELECT *", "{{7*7}}", "Resource": "*"). Por isso o "*" de
// abertura nao pode ser seguido de espaco, o miolo nao pode ter crase (trecho de codigo) nem outro
// "*", e o "*" de fechamento nao pode ser colado numa letra/digito. Sem lookbehind de proposito:
// Safari < 16.4 nao parseia o regex e o bundle inteiro cairia.
//
// O "**" de fechamento do negrito nao pode ser seguido de outro "*" (`(?!\*)`): sem isso,
// "***termo***" (negrito+italico) fecharia o negrito nos 2 primeiros "*" e sobraria um "*" solto.
// Assim ele fecha no ultimo par e o miolo "*termo*" cai na recursao de renderInline.
//
// Codigo inline "`x`" (Fase 52): o texto curado usa crase pra identificadores (`client_secret`,
// `{{7*7}}`) e ela aparecia literal. O miolo do codigo e texto puro, nunca reprocessado: e isso que
// mantem "*" e "**" de dentro de crase (wildcard, SELECT *, **kwargs) fora do italico/negrito.
// Crase dupla ("`` ` ``", o jeito de escrever uma crase literal, Dia 18) tambem e codigo.
const INLINE_PATTERN =
  /\*\*(.+?)\*\*(?!\*)|\[([^\]]+)\]\(([^)\s]+)\)|\*(?![\s*])([^*`\n]*?[^\s*`])\*(?![\w*])|``((?:[^`\n]|`(?!`))+?)``|`([^`\n]+)`/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    const [, boldText, linkText, linkUrl, italicText, doubleCodeText, codeText] = match;
    if (boldText !== undefined) {
      // Recursivo: "**Terminacao TLS (*TLS Offloading*):**" tem italico dentro do negrito.
      nodes.push(<strong key={key++}>{renderInline(boldText)}</strong>);
    } else if (italicText !== undefined) {
      nodes.push(<em key={key++}>{italicText}</em>);
    } else if (doubleCodeText !== undefined || codeText !== undefined) {
      nodes.push(
        <code key={key++} className="rounded border border-stroke bg-base px-1 font-mono text-[0.85em] text-primary">
          {doubleCodeText !== undefined ? doubleCodeText.trim() : codeText}
        </code>,
      );
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

// Item de lista com 1 nivel de aninhamento: e o que o texto curado usa (bullets indentados sob um
// bullet - Dias 57/59, projeto da Semana 8 - ou sob um item numerado - Dia 3). Nivel 3+ nao existe no
// conteudo e cai no mesmo nivel do 2 (o recuo so decide "e filho do ultimo item", nao a profundidade).
interface ListItem {
  text: string;
  children: string[];
}

interface OpenList {
  ordered: boolean;
  start: number;
  items: ListItem[];
}

// Recuo de 2+ espacos (ou tab) marca um sub-item - so os bullets "- " aninham, numerado indentado
// continua item de topo.
const INDENTED = /^(?: {2,}|\t)/;

/**
 * Renderiza um bloco de Texto Cru (markdown minimo - titulos "###"/"####", listas "- item" e
 * "1. item" (com sub-bullets indentados), e negrito/italico/codigo/link inline dentro de
 * titulos/paragrafos/itens, ver renderInline acima). Sem lib de markdown (nenhuma no projeto) - so
 * `#### Titulo` e `- item` viravam texto cru na tela (ver bug reportado ao vivo), o resto ja era
 * paragrafo simples de verdade. A lista numerada e o aninhamento entraram com o Projeto Semanal (Fase
 * 58): as especificacoes dos 12 projetos usam os dois, e as leituras tambem (28 dias com "1."/"2.").
 *
 * Fase 30: blocos cercados ("```") sao isolados ANTES do parser linha-a-linha (splitFences, ver
 * lib/markdown.ts - fence e multi-linha, nao da pra tratar no loop de baixo). "```diagrama" vira
 * um DiagramBlock (diagramas de fluxo simples, feedback do usuario de que texto corrido sem
 * referencia visual fica dificil de entender); qualquer outro "```" vira bloco de codigo
 * monoespacado simples (sem highlight de sintaxe - bonus de baixo custo por reaproveitar a mesma
 * deteccao de fence, ex: a requisicao HTTP crua do Dia 1).
 *
 * Compartilhado entre ReadingActivity (leitura da atividade), ContentPreviewModal (revisao via
 * sidebar, Fase 23), o Caderninho de Anotacoes (Fase 29, notebook/) e a especificacao do Projeto
 * Semanal (WeeklyProjectPage, Fase 58) - mesmo Texto Cru, agora 4 lugares que precisam mostra-lo
 * formatado (e, por extensao, os 3 primeiros ganham diagrama/bloco de codigo de graca caso um aluno
 * cole essa sintaxe numa nota pessoal - efeito esperado do componente compartilhado, nao um caso
 * especial).
 */
export function MarkdownBlock({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: OpenList | null = null;

  function flushList() {
    if (!list) return;
    const items = list.items.map((item, i) => (
      <li key={i} className="text-sm leading-[1.5] text-secondary">
        {renderInline(item.text)}
        {item.children.length > 0 && (
          <ul className="ml-4 mt-1.5 list-[circle] space-y-1">
            {item.children.map((child, j) => (
              <li key={j}>{renderInline(child)}</li>
            ))}
          </ul>
        )}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length} start={list.start} className="ml-5 list-decimal space-y-1.5">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="ml-4 list-disc space-y-1.5">
          {items}
        </ul>
      ),
    );
    list = null;
  }

  // Acrescenta um item de topo, abrindo lista nova se nao ha uma aberta ou se a aberta e de outro
  // tipo (bullet <-> numerada). `start` so vale pro 1o item: "<ol start>" numera o resto sozinho, e
  // uma lista que a linha em branco quebrou retoma do numero que o texto escreveu (ex: "2.").
  function addListItem(ordered: boolean, start: number, text: string) {
    if (list && list.ordered !== ordered) flushList();
    list ??= { ordered, start, items: [] };
    list.items.push({ text, children: [] });
  }

  // Bullet indentado vira filho do ultimo item da lista aberta (bullet ou numerada). Sem lista
  // aberta devolve false e o chamador o trata como item de topo, em vez de descartar o texto.
  function addNestedItem(text: string): boolean {
    const parent = list?.items.at(-1);
    if (!parent) return false;
    parent.children.push(text);
    return true;
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
            {renderInline(subsection[1])}
          </h3>,
        );
        continue;
      }

      const title = line.match(/^###\s+(.+)/);
      if (title) {
        flushList();
        blocks.push(
          <h2 key={blocks.length} className="text-xl font-bold text-primary">
            {renderInline(title[1])}
          </h2>,
        );
        continue;
      }

      const bullet = line.match(/^-\s+(.+)/);
      if (bullet) {
        if (!INDENTED.test(rawLine) || !addNestedItem(bullet[1])) addListItem(false, 1, bullet[1]);
        continue;
      }

      const numbered = line.match(/^(\d+)\.\s+(.+)/);
      if (numbered) {
        addListItem(true, Number(numbered[1]), numbered[2]);
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
