import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

// Quanto tempo a barra fica visivel depois do ultimo evento de scroll antes de sumir.
const HIDE_AFTER_MS = 700;
const MIN_THUMB_PX = 24;

/**
 * Area com rolagem interna e barra minimalista (Fase 61, Figma "LAYOUT CRU - PROJETO SEMANAL",
 * node 178:132) - base do layout "sem rolagem externa, so dentro dos componentes" que o dono quer
 * levar pro sistema inteiro. Ver docs/fase-61 pra abordagem completa.
 *
 * Por que nao estilizar a barra nativa (::-webkit-scrollbar): ela nao aceita transicao de opacidade
 * nem filtro, entao "aparecer so enquanto rola e sumir com desfoque" e impossivel nela. A nativa
 * fica escondida (`scrollbar-none`) e a barra e um <div> absoluto por cima, posicionado a partir de
 * scrollTop/scrollHeight/clientHeight. A ROLAGEM continua 100% nativa (roda, toque, teclado,
 * leitor de tela) - so o desenho da barra e nosso; `pointer-events-none` nela (nao e arrastavel).
 *
 * `className` estiliza o cartao externo (precisa de altura definida por quem chama - `h-full`,
 * `flex-1 min-h-0` etc - senao nada rola); `contentClassName`, o miolo que rola (padding vai aqui,
 * pra barra ficar fora dele, grudada na borda do cartao como no Figma: 8px da direita, 24px de
 * margem em cima/embaixo).
 */
export function ScrollArea({
  className = '',
  contentClassName = '',
  scrollRef,
  children,
}: {
  className?: string;
  contentClassName?: string;
  /** Acesso ao elemento que rola (ex: chat que rola pro fim a cada mensagem nova). */
  scrollRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const ownRef = useRef<HTMLDivElement>(null);
  const ref = scrollRef ?? ownRef;
  const [thumb, setThumb] = useState<{ top: number; height: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setThumb(null);
      return;
    }
    // Trilho = altura visivel menos a margem de 24px em cima e embaixo (inset-y-6 abaixo).
    const track = clientHeight - 48;
    const height = Math.max(MIN_THUMB_PX, (clientHeight / scrollHeight) * track);
    const top = (scrollTop / (scrollHeight - clientHeight)) * (track - height);
    setThumb({ top, height });
  }, [ref]);

  function handleScroll() {
    measure();
    setVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), HIDE_AFTER_MS);
  }

  // Conteudo que muda de tamanho sem scroll (mensagem nova no chat, token gerado, janela
  // redimensionada) - remede sem mostrar a barra.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [ref, measure, children]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} onScroll={handleScroll} className={`scrollbar-none h-full overflow-y-auto ${contentClassName}`}>
        {children}
      </div>
      {thumb && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-6 right-2 w-1">
          <div
            className={`absolute w-1 rounded-full bg-accent transition-[opacity,filter] duration-500 motion-reduce:transition-none ${
              visible ? 'opacity-100 blur-0' : 'opacity-0 blur-[3px]'
            }`}
            style={{ top: thumb.top, height: thumb.height }}
          />
        </div>
      )}
    </div>
  );
}
