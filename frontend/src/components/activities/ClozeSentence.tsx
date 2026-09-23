const BLANK = /_{3,}/g;

/**
 * Frase com lacuna (Fase 9 como `CodeHighlight`; pixel art na Fase 68, Figma "Daily — 08"): troca cada
 * `___` por "[ ____ ]" em ambar - ou pela palavra que ja preenche a lacuna (`fill`, depois de
 * responder). Tudo em VT323 (monoespacada), inclusive os trechos de codigo embutidos na frase.
 */
export function ClozeSentence({ text, fill }: { text: string; fill?: { value: string; correct: boolean } }) {
  const parts = text.split(BLANK);

  return (
    <div className="border-2 border-stroke bg-surface px-5 py-4 font-pixel text-2xl leading-[1.3] text-secondary lg:text-[26px]">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 &&
            (fill ? (
              <span className={`${fill.correct ? 'text-accent' : 'text-alert'}`}>{fill.value}</span>
            ) : (
              <span className="text-project">[ ________ ]</span>
            ))}
        </span>
      ))}
    </div>
  );
}
