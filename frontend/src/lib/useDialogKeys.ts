import { useEffect, useRef, type RefObject } from 'react';

/**
 * Comportamento comum de Modal e Gaveta do redesign v1 (Fase 109): ESC fecha, o foco entra no
 * diálogo ao abrir e volta pra quem abriu ao fechar.
 *
 * ESC em captura + stopPropagation, como no `PixelModal`: o ESC que fecha não chega aos atalhos de
 * baixo (na sessão, o ESC da TodayPage alterna as Configurações). Um `PixelConfirmDialog` aberto por
 * cima trata o próprio ESC, então este não fecha os dois de uma vez. Com um Modal aberto de dentro da
 * Gaveta (confirmação de sair, Fase 109b), só o diálogo de cima da pilha responde ao ESC.
 */
const stack: symbol[] = [];

export function useDialogKeys(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const token = Symbol('dialog');
    stack.push(token);
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-pixel-confirm]')) return;
      if (stack[stack.length - 1] !== token) return;
      e.stopPropagation();
      onCloseRef.current();
    }
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(token), 1);
      if (opener?.isConnected) opener.focus();
    };
  }, [ref]);
}
