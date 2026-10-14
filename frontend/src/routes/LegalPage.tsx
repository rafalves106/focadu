import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import backArrow from '../assets/pixel/voltar.png';
import { EntryScreen } from '../components/entry/Entry';
import { LegalFooter } from '../components/legal/LegalBits';
import { LegalSections } from '../components/legal/LegalContent';
import { LEGAL_DOCS, LEGAL_VERSION, type LegalDocKey } from '../lib/legal';

/**
 * /termos e /privacidade (Fase 102, Figma "Termos e Privacidade — v1", pagina 305:4502): leitura longa, sem login.
 * Indice fixo a esquerda no desktop e em sanfona no celular; "Voltar" volta pra tela anterior (sem historico, /login).
 */
export function LegalPage({ doc }: { doc: LegalDocKey }) {
  const navigate = useNavigate();
  const [indexOpen, setIndexOpen] = useState(false);
  const current = LEGAL_DOCS[doc];
  const other = LEGAL_DOCS[doc === 'termos' ? 'privacidade' : 'termos'];

  function goBack() {
    // Aberto em nova aba (a partir do cadastro) nao ha historico: o fallback e o login.
    if (window.history.length > 1) navigate(-1);
    else navigate('/login');
  }

  const index = (
    <ol className="flex flex-col gap-1">
      {current.sections.map((s) => (
        <li key={s.n}>
          <a
            href={`#secao-${s.n}`}
            onClick={() => setIndexOpen(false)}
            className="flex min-h-10 items-center gap-2 px-2 font-pixel text-xl leading-none text-secondary hover:text-accent"
          >
            <span className="w-6 text-accent">{s.n}</span>
            {s.short}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <EntryScreen>
      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-12 lg:py-12">
        <aside className="lg:sticky lg:top-8 lg:h-fit lg:w-60 lg:shrink-0">
          <button type="button" onClick={goBack} className="mb-4 flex min-h-10 items-center gap-2 font-pixel-label text-[9px] text-accent hover:brightness-125">
            <img src={backArrow} alt="" className="size-4 pixelated" />
            Voltar
          </button>
          <p className="mb-2 hidden font-pixel-label text-[9px] text-secondary lg:block">// Nesta página</p>
          <div className="hidden lg:block">{index}</div>
          <div className="lg:hidden">
            <button
              type="button"
              aria-expanded={indexOpen}
              onClick={() => setIndexOpen((v) => !v)}
              className="flex min-h-11 w-full items-center justify-between border-2 border-stroke px-3 font-pixel-label text-[9px] text-secondary"
            >
              Índice
              <span aria-hidden="true">{indexOpen ? '−' : '+'}</span>
            </button>
            {indexOpen && <div className="border-2 border-t-0 border-stroke p-2">{index}</div>}
          </div>
        </aside>

        <article className="flex min-w-0 max-w-[720px] flex-1 flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="font-pixel text-[44px] leading-none text-accent">{current.title}</h1>
            <p className="font-pixel-label text-[9px] text-secondary">Versão {LEGAL_VERSION}</p>
          </header>
          <LegalSections sections={current.sections} />
          <aside className="flex flex-col gap-2 border-2 border-stroke bg-surface p-4">
            <p className="font-pixel-label text-[9px] text-secondary">// Leia também</p>
            <Link to={other.path} className="font-pixel text-2xl leading-none text-accent underline underline-offset-2 hover:brightness-125">
              {other.title} ›
            </Link>
          </aside>
        </article>
      </div>
      <LegalFooter />
    </EntryScreen>
  );
}
