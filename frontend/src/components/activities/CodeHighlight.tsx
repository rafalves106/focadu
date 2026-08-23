const BLANK = /_{3,}/g;
/** Heuristica simples: se o texto tem caracteres tipicos de codigo, usa fonte monoespacada. */
const LOOKS_LIKE_CODE = /[(){};=`]|\.\w/;

/**
 * Realca a lacuna (`___`) de um prompt de Cloze (Fase 9, design Figma "Cloze 2") - sem parser de
 * codigo de verdade: os prompts reais do seed sao 1 frase (as vezes com um trecho de codigo
 * embutido, ex: "document.___ = ..."), nao um bloco multi-linha como o mockup do Figma mostra.
 * Divide por `___`, troca cada ocorrencia por uma pilula destacada; usa fonte mono no texto
 * inteiro quando ele "parece" codigo (heuristica, nao um highlighter real).
 *
 * Fase 19: o Figma usa a fonte "Cousine" pro bloco de codigo - reaproveitado `font-mono` (Fira
 * Code, ja carregada pra Fase 18) em vez de somar uma 4a familia de fonte ao app so pra 1 bloco.
 */
export function CodeHighlight({ text }: { text: string }) {
  const parts = text.split(BLANK);
  const monospace = LOOKS_LIKE_CODE.test(text);

  return (
    <div className={`rounded-xl border border-stroke bg-base p-5 leading-relaxed ${monospace ? 'font-mono' : ''} text-[15px] text-primary`}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="mx-1 rounded bg-accent/10 px-2 py-0.5 font-mono font-bold text-accent">____</span>
          )}
        </span>
      ))}
    </div>
  );
}
