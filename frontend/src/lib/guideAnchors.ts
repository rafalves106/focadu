/** Elemento visivel com `data-guia="<anchor>"` (guia das telas, Fase 75) - ignora os escondidos (celular/desktop). */
export function findAnchor(anchor: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-guia="${anchor}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** O passo tem o elemento dele visivel agora? (o tour de uma tela so leva os passos que tem). */
export function anchorVisible(anchor: string | undefined): boolean {
  return !!anchor && findAnchor(anchor) !== null;
}
