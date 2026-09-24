import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Casca de modal em pixel art (24/09/2026, pedido do dono: "todos os modais no estilo pixelizado") -
 * mesmo fundo do `PixelConfirmDialog`/`StreakLostModal` e a caixa `pixel-box` dos cartoes da trilha,
 * com o rotulo "// TITULO" em Silkscreen. Pra modais de conteudo/formulario (notas, configuracoes,
 * publicacao); pergunta de sim/nao continua no `PixelConfirmDialog` (fala da Focada + resposta).
 *
 * Sem `onClose`, o modal nao fecha pelo fundo, pelo ESC nem por "X" (sessao expirada, linguagem dos
 * projetos: a causa nao some so por fechar). O conteudo rola por dentro, nunca a pagina.
 */
export function PixelModal({
  label,
  title,
  onClose,
  role = 'dialog',
  widthClass = 'max-w-xl',
  children,
}: {
  /** Nome acessivel do dialogo. */
  label: string;
  /** Rotulo pequeno do topo ("// CONFIGURACOES"); omitido, o topo so tem o "X". */
  title?: string;
  onClose?: () => void;
  role?: 'dialog' | 'alertdialog';
  widthClass?: string;
  children: ReactNode;
}) {
  // Ultimo onClose numa ref: o listener de ESC e registrado uma vez so, ao abrir.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const dismissable = onClose !== undefined;
  useEffect(() => {
    if (!dismissable) return;
    // Captura + stopPropagation: o ESC que fecha o modal nao chega aos atalhos de baixo (na sessao, o
    // ESC da TodayPage alterna as Configuracoes - fechar as anotacoes nao pode abrir o menu).
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Um PixelConfirmDialog aberto por cima trata o proprio ESC - nao fecha os dois de uma vez.
      if (document.querySelector('[data-pixel-confirm]')) return;
      e.stopPropagation();
      onCloseRef.current?.();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dismissable]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        role={role}
        aria-modal="true"
        aria-label={label}
        className={`pixel-box flex max-h-[85vh] w-full ${widthClass} flex-col bg-base`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || dismissable) && (
          <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5">
            {title ? <p className="font-pixel-label text-[10px] text-accent">// {title}</p> : <span />}
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                title="Fechar (Esc)"
                className="font-pixel-label text-xs leading-none text-secondary hover:text-primary"
              >
                X
              </button>
            )}
          </div>
        )}
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pt-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

/** Campo de texto pixel (mesmo do `QuickNotePanel` na variante pixel): borda reta de 2px, VT323. */
export const pixelField =
  'w-full border-2 border-stroke bg-surface px-3 py-2 font-pixel text-xl leading-snug text-primary placeholder:text-muted focus:border-accent focus:outline-none';
