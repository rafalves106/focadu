// Fase 94, Painel de gestao: classe do campo de texto das gavetas e modais.
export function inputClass(invalid = false) {
  return `h-10 w-full border-2 bg-surface px-3 text-[14px] text-primary outline-none placeholder:text-muted focus:border-accent ${invalid ? 'border-alert' : 'border-stroke'}`;
}
