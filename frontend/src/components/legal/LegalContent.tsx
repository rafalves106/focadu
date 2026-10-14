import type { ReactNode } from 'react';
import type { LegalBlock, LegalSection } from '../../lib/legal';

/** `**negrito**` inline - o unico markup que os textos legais usam. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') ? (
          <strong key={i} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Table({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  return (
    <>
      {/* Desktop: tabela de 3 colunas. */}
      <table className="hidden w-full border-collapse text-left text-[15px] leading-snug md:table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-2 border-stroke bg-surface px-3 py-2 font-pixel-label text-[9px] font-normal text-secondary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className="border-2 border-stroke px-3 py-2 align-top">
                  <Inline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Celular: um cartao por linha. */}
      <div className="flex flex-col gap-3 md:hidden">
        {body.map((row) => (
          <dl key={row[0]} className="flex flex-col gap-2 border-2 border-stroke bg-surface p-3 text-[15px] leading-snug">
            {row.map((cell, i) => (
              <div key={i}>
                <dt className="font-pixel-label text-[8px] text-secondary">{head[i]}</dt>
                <dd>
                  <Inline text={cell} />
                </dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </>
  );
}

function Block({ block }: { block: LegalBlock }): ReactNode {
  if ('p' in block) return <p><Inline text={block.p} /></p>;
  if ('ul' in block)
    return (
      <ul className="ml-5 list-disc space-y-1.5">
        {block.ul.map((li) => (
          <li key={li}>
            <Inline text={li} />
          </li>
        ))}
      </ul>
    );
  return <Table rows={block.table} />;
}

/** Corpo de um documento: Inter 16/26 numa coluna de leitura (Figma, decisao 1). */
export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className="flex flex-col gap-8 font-sans text-base leading-[26px] text-secondary">
      {sections.map((s) => (
        <section key={s.n} id={`secao-${s.n}`} className="flex scroll-mt-6 flex-col gap-3">
          <h2 className="font-pixel text-[28px] leading-none text-primary">
            {s.n}. {s.title}
          </h2>
          {s.items.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
