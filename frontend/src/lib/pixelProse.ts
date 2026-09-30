/**
 * Texto curado (MarkdownBlock + DiagramBlock) em pixel art (Fase 68): VT323 em paragrafos, listas e
 * titulos, e cantos retos nos diagramas. Por seletor no pai, porque os dois componentes sao
 * compartilhados com telas que continuam em Inter (Caderninho, previas). Fase 86 (pedido do dono): codigo
 * - blocos e inline - em Fira Code (`font-mono`); em VT323 l/1/I e 0/O se confundiam e o bloco perdia o
 * alinhamento. Inline em 0.8em do paragrafo; bloco em 15px.
 */
export const PIXEL_PROSE =
  '[&_code]:font-mono [&_p_code]:text-[0.8em] [&_li_code]:text-[0.8em] [&_pre]:text-[15px] [&_ol]:ml-8 [&_ul]:ml-6 [&_h2]:font-pixel [&_h2]:text-[32px] [&_h2]:font-normal [&_h2]:leading-none [&_h3]:font-pixel [&_h3]:text-[28px] [&_h3]:font-normal [&_h3]:leading-none [&_li]:font-pixel [&_li]:text-[21px] [&_li]:leading-[1.2] [&_p]:font-pixel [&_p]:text-[21px] [&_p]:leading-[1.2] [&_span]:font-pixel [&_span]:text-lg [&_span]:leading-tight [&_.rounded-full]:rounded-none [&_.rounded-lg]:rounded-none [&_.rounded-xl]:rounded-none';
