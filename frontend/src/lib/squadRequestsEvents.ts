/**
 * Aviso interno de "os pedidos de entrada do squad mudaram" (Fase 77) - o QG decide um pedido e o
 * contador do Squad no menu (GlobalNav) busca de novo, sem esperar a proxima navegacao.
 */
const EVENT = 'focadu:squad-requests-changed';

export function notifySquadRequestsChanged() {
  window.dispatchEvent(new Event(EVENT));
}

export function onSquadRequestsChanged(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
