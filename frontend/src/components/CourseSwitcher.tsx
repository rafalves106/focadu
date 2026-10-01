/**
 * Seletor de curso das telas que mostram um curso por vez (Trilha, Ranking, Squad, Perfil) - so aparece com
 * 2+ matriculas. Mesmo botao em blocos dos recortes do Ranking. `allLabel` acrescenta a opcao "todos" (id null).
 */
export function CourseSwitcher({
  courses,
  selectedId,
  onSelect,
  allLabel,
  className = '',
}: {
  courses: readonly { id: string; name: string }[] | null | undefined;
  selectedId: string | null;
  onSelect: (courseId: string | null) => void;
  allLabel?: string;
  className?: string;
}) {
  if (!courses || courses.length < 2) return null;
  const options: { id: string | null; name: string }[] = [...(allLabel ? [{ id: null, name: allLabel }] : []), ...courses];
  return (
    <div role="tablist" aria-label="Curso" className={`flex flex-wrap items-center gap-2 ${className}`} data-testid="course-switcher">
      <span className="font-pixel-label text-[8px] text-muted">Curso</span>
      {options.map((c) => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id ?? 'todos'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(c.id)}
            className={`max-w-56 truncate border-2 px-2.5 py-1.5 font-pixel-label text-[8px] leading-none ${
              active ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
