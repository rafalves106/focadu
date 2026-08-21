/**
 * Chip de interesse selecionável (Fase 13b, Entrevista de Perfil) - multi-select, mesmo padrao
 * visual de estado ativo/inativo do OptionCard (border-accent + bg-accent/10 quando selecionado).
 */
export function InterestChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? 'border-accent bg-accent/10 text-primary'
          : 'border-surface-alt bg-surface text-secondary hover:border-secondary'
      }`}
    >
      {label}
    </button>
  );
}
