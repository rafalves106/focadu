import { useEffect, useLayoutEffect, useRef } from 'react';

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Atalhos de teclado da sessao (Fase 68): teclas 1-9 escolhem opcao e Enter confirma/continua.
 * Ignora quando o foco esta num campo de texto (anotacao, duvida, resposta de lacuna) e com
 * Ctrl/Alt/Meta, e Enter em botao/link focado (o navegador ja clica). O handler fica numa ref: o listener e instalado uma vez so por montagem.
 */
export function useSessionKeys(handler: (key: string, event: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler);
  useLayoutEffect(() => {
    ref.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey || isTyping(e.target)) return;
      // Enter num botao/link focado ja dispara o clique nativo - tratar aqui tambem faria a acao 2x
      // (ex.: "Continuar" pulando 2 etapas).
      if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.closest('button, a')) return;
      ref.current(e.key, e);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
