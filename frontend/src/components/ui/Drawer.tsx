import { useRef, type ReactNode } from 'react';
import { useDialogKeys } from '../../lib/useDialogKeys';

/**
 * Gaveta do redesign v1 (Fase 109; Figma `13:579`): abre por cima do conteúdo, com cabeçalho (título
 * em verde e "Fechar · Esc") e sombra sólida neutra de 4px. Desktop e notebook: 360 de largura, colada
 * à direita, logo abaixo da nav. Celular: largura cheia, de baixo. Uma gaveta por vez. O conteúdo rola
 * por dentro só se não couber (último recurso).
 */
export function Drawer({
  label,
  title,
  onClose,
  children,
}: {
  /** Nome acessível do diálogo. */
  label: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogKeys(ref, onClose);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-base/72" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-var(--nav-height))] flex-col border-2 border-stroke-strong bg-surface pb-[env(safe-area-inset-bottom)] outline-none md:top-[var(--nav-height)] md:left-auto md:max-h-none md:w-[360px] md:shadow-[4px_4px_0_0_var(--color-stroke-strong)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-stroke px-4 py-4 md:px-6">
          <p className="text-rotulo text-accent">{title}</p>
          <button type="button" onClick={onClose} className="text-rotulo-sm text-secondary hover:text-primary">
            Fechar · Esc
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">{children}</div>
      </div>
    </>
  );
}
