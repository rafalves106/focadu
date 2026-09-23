import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import focadaNeutra from '../assets/pixel/focada-neutra.png';

/**
 * Confirmacao em pixel art (Fase 64) - a Focada pergunta, o agente responde. Criada pra entrega do
 * Projeto Semanal (pedido do dono: um clique errado estragava a entrega, que e avaliada na hora e nao
 * aceita reenvio depois de avaliada), mas generica.
 *
 * Seguranca contra clique errado: o foco abre na opcao de CANCELAR (Enter/clique repetido por reflexo
 * nao confirma - a seta ◀ marca a opcao em foco, igual menu de jogo), ESC e clique fora cancelam, e as
 * duas opcoes ficam em linhas separadas. Um cursor de selecao so: passar o mouse MOVE o foco pra opcao
 * (em vez de acender as duas, hover + foco), e setas cima/baixo trocam de opcao.
 */
export function PixelConfirmDialog({
  open,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Ultimo onCancel numa ref: o foco inicial so pode acontecer ao ABRIR - com onCancel nas deps, cada
  // re-render do pai (callback novo) puxaria o foco de volta pro "cancelar" no meio da escolha.
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onCancelRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  function focusSelf(e: MouseEvent<HTMLButtonElement>) {
    e.currentTarget.focus();
  }

  function moveSelection(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const sibling = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
    if (sibling instanceof HTMLButtonElement) sibling.focus();
  }

  const option =
    'group flex items-baseline gap-2 text-right font-pixel text-[22px] leading-snug text-primary focus:text-project focus:outline-none lg:text-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pixel-confirm-message"
        className="flex w-full max-w-2xl flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-end gap-4">
          <div className="pixel-box hidden shrink-0 bg-surface p-2 sm:block">
            <img src={focadaNeutra} alt="" className="size-24 pixelated" aria-hidden="true" />
          </div>
          <div className="pixel-box flex min-w-0 flex-1 flex-col gap-3 bg-base px-6 pt-5 pb-5">
            <span className="font-pixel-label text-sm text-accent">Focada</span>
            <p id="pixel-confirm-message" className="font-pixel text-[22px] leading-snug text-primary lg:text-2xl">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <div role="group" aria-label="Sua resposta" className="pixel-box flex min-w-0 flex-col items-end gap-3 bg-base px-6 pt-4 pb-4 sm:min-w-[55%]">
            <span className="font-pixel-label text-sm text-project">Você</span>
            <button ref={cancelRef} type="button" onClick={onCancel} onMouseEnter={focusSelf} onKeyDown={moveSelection} className={option}>
              {cancelLabel}
              <span className="text-project opacity-0 group-focus:opacity-100" aria-hidden="true">
                ◀
              </span>
            </button>
            <button type="button" onClick={onConfirm} onMouseEnter={focusSelf} onKeyDown={moveSelection} className={option}>
              {confirmLabel}
              <span className="text-project opacity-0 group-focus:opacity-100" aria-hidden="true">
                ◀
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
