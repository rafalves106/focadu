import { useState } from 'react';
import { FAQ, REPORT_FORM_URL, type GuideItem, type GuideScreen } from '../../lib/guiaTelas';
import { Button } from '../ui/Button';
import { FocadaLine } from '../ui/FocadaLine';
import { Modal } from '../ui/Modal';

/** Busca sem acento e sem caixa ("sequencia" acha "Sequência"). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Ajuda desta tela (Fase 109; Figma `33:1655`): título da tela, uma fala da Focada e os itens de
 * `guiaTelas.ts` em lista; "Entendi" fecha. Sem tour. Das abas da Fase 75 ficaram dois links discretos:
 * "Perguntas frequentes" (troca a lista pelas perguntas, com busca) e "Achou um problema?" (abre o
 * formulário do teste fechado já com a tela, o endereço, o navegador e a hora).
 */
export function HelpModal({
  screen,
  items,
  context,
  onClose,
}: {
  screen: GuideScreen;
  /** Itens da tela (no Dia, a etapa em tela vem primeiro). */
  items: GuideItem[];
  /** Resumo da tela pro report (tela, endereço, navegador, tamanho, hora). */
  context: Record<string, string>;
  onClose: () => void;
}) {
  const [view, setView] = useState<'tela' | 'perguntas'>('tela');
  const reportUrl = REPORT_FORM_URL ? `${REPORT_FORM_URL}?${new URLSearchParams(context).toString()}` : null;

  return (
    <Modal label={`Ajuda: ${screen.title}`} eyebrow={view === 'tela' ? 'Ajuda desta tela' : 'Perguntas frequentes'} title={screen.title} onClose={onClose} width={640}>
      {view === 'tela' ? (
        <>
          <FocadaLine size="devolutiva">{screen.focada}</FocadaLine>
          <dl className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.title} className="flex flex-col gap-1">
                <dt className="text-rotulo text-accent">{item.title}</dt>
                <dd className="text-pequeno text-primary">{item.text}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <FaqList />
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button kind="secundario" onClick={onClose}>
          Entendi
        </Button>
        {!screen.outside && (
          <button type="button" onClick={() => setView(view === 'tela' ? 'perguntas' : 'tela')} className="text-rotulo-sm text-accent hover:text-accent-hover">
            {view === 'tela' ? 'Perguntas frequentes' : 'Voltar pra ajuda da tela'}
          </button>
        )}
        {reportUrl && (
          <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="text-rotulo-sm text-secondary hover:text-primary">
            Achou um problema?
          </a>
        )}
      </div>
    </Modal>
  );
}

function FaqList() {
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const q = fold(query.trim());
  const list = FAQ.map((f, i) => ({ ...f, i })).filter((f) => !q || fold(f.q + ' ' + f.a).includes(q));

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar uma pergunta"
        aria-label="Buscar uma pergunta"
        className="h-12 w-full border-2 border-stroke-strong bg-base px-4 text-corpo text-primary placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <ul className="flex flex-col">
        {list.map((f) => {
          const open = openIndex === f.i || (!!q && list.length === 1);
          return (
            <li key={f.q} className="border-t-2 border-stroke">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : f.i)}
                className="flex min-h-11 w-full items-center justify-between gap-4 py-2 text-left"
              >
                <span className={`text-corpo ${open ? 'text-accent' : 'text-primary'}`}>{f.q}</span>
                <span className={`text-corpo ${open ? 'text-accent' : 'text-muted'}`} aria-hidden="true">
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && <p className="pb-3 text-pequeno text-secondary">{f.a}</p>}
            </li>
          );
        })}
        {list.length === 0 && <li className="text-pequeno text-secondary">Nada com isso. Tenta outra palavra.</li>}
      </ul>
    </div>
  );
}
