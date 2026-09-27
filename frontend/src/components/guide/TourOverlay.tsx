import { useEffect, useRef, useState } from 'react';
import focadaNeutra from '../../assets/pixel/focada-neutra.png';
import focadaComemorando from '../../assets/pixel/focada-comemorando.png';
import { findAnchor } from '../../lib/guideAnchors';
import type { TourStep } from '../../lib/guiaTelas';

/** Quanto esperar o elemento do passo aparecer (a tela pode estar carregando depois de navegar). */
const ANCHOR_WAIT_MS = 2500;
const PAD = 8;

/**
 * Tour do guia das telas (Fase 75, Figma quadros 05-06): escurece a tela com um recorte no elemento
 * do passo e mostra a Focada explicando. Passo sem elemento (ou que nao apareceu em 2,5s) vira um
 * balao no centro. Esc pula, setas/Enter andam. Bloqueia cliques na tela por baixo enquanto roda.
 */
export function TourOverlay({
  step,
  index,
  total,
  onNext,
  onBack,
  onSkip,
  finishLabel = 'Entendi',
}: {
  step: TourStep;
  index: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** Texto do botao no ultimo passo. */
  finishLabel?: string;
}) {
  // Montado de novo a cada passo (`key` no GuideProvider), entao o estado inicial ja e do passo.
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [searching, setSearching] = useState(!!step.anchor);
  const nextRef = useRef<HTMLButtonElement>(null);
  const isLast = index === total - 1;

  // Acha o elemento (esperando a tela carregar), rola ate ele e acompanha resize/rolagem.
  useEffect(() => {
    if (!step.anchor) return;
    const anchor = step.anchor;
    const started = Date.now();
    let scrolled = false;
    const timer = window.setInterval(() => {
      const el = findAnchor(anchor);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          scrolled = true;
        }
        setRect(el.getBoundingClientRect());
        setSearching(false);
      } else if (Date.now() - started > ANCHOR_WAIT_MS) {
        setRect(null);
        setSearching(false);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [step]);

  const handlers = useRef({ onNext, onBack, onSkip });
  useEffect(() => {
    handlers.current = { onNext, onBack, onSkip };
  }, [onNext, onBack, onSkip]);

  useEffect(() => {
    // Captura + stopPropagation: as teclas do tour nao chegam aos atalhos da sessao (1-N/Enter/Esc).
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handlers.current.onSkip();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') handlers.current.onNext();
      else if (e.key === 'ArrowLeft') handlers.current.onBack();
      else return;
      e.preventDefault();
      e.stopPropagation();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    if (!searching) nextRef.current?.focus();
  }, [searching, index]);

  if (searching) return <div className="fixed inset-0 z-[60]" aria-hidden="true" />;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(440, vw - 32);
  let cardStyle: React.CSSProperties;
  if (!rect) {
    cardStyle = { left: (vw - cardWidth) / 2, top: '50%', transform: 'translateY(-50%)' };
  } else {
    const left = Math.min(Math.max(rect.left, 16), vw - cardWidth - 16);
    const below = vh - rect.bottom - PAD;
    const above = rect.top - PAD;
    if (below >= 240) cardStyle = { left, top: rect.bottom + PAD + 16 };
    else if (above >= 240) cardStyle = { left, bottom: vh - rect.top + PAD + 16 };
    else cardStyle = { left: (vw - cardWidth) / 2, bottom: 24 };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Tour: ${step.title}`}>
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed shadow-[0_0_0_9999px_rgba(10,10,10,0.8)] outline-2 outline-accent outline-dashed"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-base/80" />
      )}

      <div
        className="fixed flex flex-col gap-3.5 border-2 border-[#1c9e3e] bg-base px-[18px] py-4 shadow-[6px_6px_0_0_#1c9e3e]"
        style={{ ...cardStyle, width: cardWidth }}
        aria-live="polite"
      >
        <div className="flex gap-3.5">
          <div className="flex shrink-0 items-center justify-center self-start border-2 border-stroke bg-stroke/35 p-1">
            <img src={isLast ? focadaComemorando : focadaNeutra} alt="Focada" className="size-16 pixelated" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="font-pixel-label text-[8px] text-accent">
              Focada · passo {index + 1} de {total}
            </p>
            <p className="font-pixel text-[26px] leading-none text-primary">{step.title}</p>
            <p className="font-pixel text-xl leading-tight text-secondary">{step.text}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`size-3 ${i <= index ? 'bg-accent' : 'bg-stroke'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            {!isLast && (
              <button type="button" onClick={onSkip} className="font-pixel-label text-[8px] text-muted hover:text-primary">
                Pular tour
              </button>
            )}
            {index > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="border-2 border-stroke px-4 py-2.5 font-pixel-label text-[9px] text-secondary hover:text-primary"
              >
                ‹ Voltar
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="bg-accent px-4 py-2.5 font-pixel-label text-[9px] text-base hover:brightness-110"
            >
              {isLast ? finishLabel : 'Próximo ›'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
