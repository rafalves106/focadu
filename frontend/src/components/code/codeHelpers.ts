/** Rascunho do passo no navegador - recarregar a pagina nao perde o que o aluno digitou. */
export function draftKey(dailyId: string, activityId: string) {
  return `focadu:passo-codigo:${dailyId}:${activityId}`;
}

export function readDraft(key: string): { code: string; output: string } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { code: string; output: string }) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: { code: string; output: string } | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // Sem storage (aba anonima, bloqueado): o rascunho so nao sobrevive a um recarregar.
  }
}

export function lineCount(text: string) {
  return text === '' ? 1 : text.replace(/\n$/, '').split('\n').length;
}

/** "**Titulo**\n\ndetalhe" (curadoria) -> titulo em destaque + o resto como Markdown. */
export function splitPrompt(prompt: string | null): { title: string; detail: string } {
  const [first, ...rest] = (prompt ?? '').split(/\n\s*\n/);
  return { title: first.replace(/^\*\*|\*\*$/g, '').trim(), detail: rest.join('\n\n').trim() };
}

export const TONE_BORDER = { stroke: 'border-stroke', accent: 'border-accent', project: 'border-project' } as const;
