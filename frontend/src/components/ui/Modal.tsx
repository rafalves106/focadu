import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogKeys } from '../../lib/useDialogKeys';

/**
 * Modal do redesign v1 (Fase 109; Figma `13:584`): véu escuro a 72%, caixa com borda forte e sombra
 * sólida neutra de 4px, cabeçalho com o eyebrow em verde e "Fechar · Esc". Um modal nunca abre outro:
 * quem abre de dentro de uma gaveta fecha a gaveta antes. ESC e clique no véu fecham. Se o conteúdo
 * não couber na janela, rola dentro da caixa (último recurso; a página nunca rola). Vai pro `body` por
 * portal: aberto de dentro da Gaveta (confirmação de sair), o véu precisa cobrir a gaveta também.
 */
export function Modal({
  label,
  eyebrow,
  title,
  onClose,
  width = 560,
  children,
}: {
  /** Nome acessível do diálogo. */
  label: string;
  eyebrow: string;
  title?: ReactNode;
  onClose: () => void;
  /** Largura em px no desktop (celular: a tela menos 16 de cada lado). */
  width?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogKeys(ref, onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/72 p-4" onClick={onClose} role="presentation">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ maxWidth: width }}
        className="flex max-h-[calc(100dvh-32px)] w-full flex-col gap-6 overflow-y-auto border-2 border-stroke-strong bg-surface p-6 shadow-[4px_4px_0_0_var(--color-stroke-strong)] outline-none md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-rotulo-sm text-accent">{eyebrow}</p>
          <button type="button" onClick={onClose} className="text-rotulo-sm text-secondary hover:text-primary">
            Fechar · Esc
          </button>
        </div>
        {title && <h2 className="-mt-2 text-titulo text-primary">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
