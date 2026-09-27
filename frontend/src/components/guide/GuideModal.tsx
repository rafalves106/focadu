import { useState } from 'react';
import { PixelModal, pixelField } from '../PixelModal';
import { FocadaSays } from '../session/FocadaSays';
import { FAQ, REPORT_FORM_URL, type GuideItem, type GuideScreen } from '../../lib/guiaTelas';

type Tab = 'tela' | 'perguntas' | 'problema';

const TAB_LABEL: Record<Tab, string> = { tela: 'Esta tela', perguntas: 'Perguntas frequentes', problema: 'Achou um problema?' };

/** Busca sem acento e sem caixa ("ofensiva" acha "Ofensiva", "graca" acha "graça"). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Janela do guia das telas (Fase 75, Figma quadros 02-04 e 09): o que a tela atual faz (com a Focada),
 * perguntas frequentes e report de problema pro formulario do teste fechado. Tela fora do app (login,
 * senha, onboarding) nao tem as perguntas - elas falam do que existe dentro.
 */
export function GuideModal({
  screen,
  items,
  context,
  canTour,
  onTour,
  onClose,
}: {
  screen: GuideScreen;
  /** Itens de "Esta tela" (na sessao, a etapa em tela vem primeiro). */
  items: GuideItem[];
  /** Resumo da tela pro report (tela, endereco, navegador, tamanho, hora). */
  context: Record<string, string>;
  canTour: boolean;
  onTour: () => void;
  onClose: () => void;
}) {
  const tabs: Tab[] = screen.outside ? ['tela', 'problema'] : ['tela', 'perguntas', 'problema'];
  const [tab, setTab] = useState<Tab>('tela');

  return (
    <PixelModal label={`Guia: ${screen.title}`} title="Guia da Focadu" onClose={onClose} widthClass="max-w-[760px]">
      <h2 className="-mt-2 font-pixel text-4xl leading-none text-primary">{screen.title}</h2>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções do guia">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`border-2 px-4 py-2.5 font-pixel-label text-[9px] ${tab === t ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'}`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <span className="h-0.5 shrink-0 bg-stroke" aria-hidden="true" />

      {tab === 'tela' && <ScreenTab screen={screen} items={items} />}
      {tab === 'perguntas' && <FaqTab />}
      {tab === 'problema' && <ReportTab context={context} />}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="hidden font-pixel-label text-[8px] text-muted sm:block">
          {tab === 'perguntas' ? 'Dúvida do conteúdo? Use o Suporte Rápido da sessão' : 'A tecla ? abre e fecha este guia'}
        </p>
        <div className="flex gap-2.5">
          {canTour && (
            <button
              type="button"
              onClick={onTour}
              className="border-2 border-stroke px-5 py-3 font-pixel-label text-[10px] text-secondary hover:text-primary"
            >
              Tour desta tela ›
            </button>
          )}
          <button type="button" onClick={onClose} className="bg-accent px-5 py-3 font-pixel-label text-[10px] text-base hover:brightness-110">
            Entendi
          </button>
        </div>
      </div>
    </PixelModal>
  );
}

function ScreenTab({ screen, items }: { screen: GuideScreen; items: GuideItem[] }) {
  return (
    <div className="flex flex-col gap-4" role="tabpanel">
      <FocadaSays size="sm">{screen.focada}</FocadaSays>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.title} className="flex flex-col gap-1 border-2 border-stroke px-4 py-3">
            <p className="font-pixel-label text-[9px] text-primary">{item.title}</p>
            <p className="font-pixel text-xl leading-tight text-secondary">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqTab() {
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const q = fold(query.trim());
  const list = FAQ.map((f, i) => ({ ...f, i })).filter((f) => !q || fold(f.q + ' ' + f.a).includes(q));

  return (
    <div className="flex flex-col gap-3" role="tabpanel">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar uma pergunta…"
        aria-label="Buscar uma pergunta"
        className={pixelField}
      />
      <ul className="flex flex-col gap-1.5">
        {list.map((f) => {
          const open = openIndex === f.i || (!!q && list.length === 1);
          return (
            <li key={f.q} className={`border-2 ${open ? 'border-[#1c9e3e] bg-[#1c9e3e]/12' : 'border-stroke'}`}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : f.i)}
                className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
              >
                <span className={`font-pixel text-[22px] leading-tight ${open ? 'text-accent' : 'text-primary'}`}>{f.q}</span>
                <span className={`font-pixel text-2xl leading-none ${open ? 'text-accent' : 'text-muted'}`} aria-hidden="true">
                  {open ? '−' : '+'}
                </span>
              </button>
              {open && <p className="px-3.5 pb-3 font-pixel text-xl leading-tight text-secondary">{f.a}</p>}
            </li>
          );
        })}
        {list.length === 0 && <li className="font-pixel text-xl text-secondary">Nada com isso. Tenta outra palavra.</li>}
      </ul>
    </div>
  );
}

function ReportTab({ context }: { context: Record<string, string> }) {
  const [copied, setCopied] = useState(false);
  const summary = Object.values(context).join(' · ');
  const formUrl = REPORT_FORM_URL ? `${REPORT_FORM_URL}?${new URLSearchParams(context).toString()}` : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" role="tabpanel">
      <FocadaSays size="sm">
        Achou um bug ou teve uma ideia? Me conta pelo formulário do teste. Quanto mais detalhe, mais rápido a gente arruma.
      </FocadaSays>
      <div className="flex flex-col gap-2 border-2 border-stroke px-[18px] py-4">
        <p className="font-pixel-label text-[10px] text-accent">// O que mandar</p>
        <ul className="flex flex-col gap-1 font-pixel text-xl leading-tight text-primary">
          <li>· Em qual tela você estava</li>
          <li>· O que você fez e o que esperava que acontecesse</li>
          <li>· Um print da tela, se der</li>
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-stroke bg-stroke/35 px-3.5 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-pixel-label text-[8px] text-muted">{formUrl ? 'Vai junto no formulário, sozinho' : 'Resumo da tela pra colar no report'}</p>
          <p className="font-pixel text-xl leading-tight break-words text-secondary">{summary}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 border-2 border-stroke px-4 py-2.5 font-pixel-label text-[9px] text-secondary hover:text-primary"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {formUrl ? (
        <a
          href={formUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-end bg-accent px-5 py-3 font-pixel-label text-[10px] text-base hover:brightness-110"
        >
          Abrir o formulário ›
        </a>
      ) : (
        <p className="font-pixel-label text-[8px] text-muted">O formulário do teste fechado ainda não está no ar. Copie o resumo e mande pro Falves.</p>
      )}
    </div>
  );
}
