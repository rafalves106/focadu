export type CourseDetailTab = 'conteudo' | 'caderninho';

const TABS: { tab: CourseDetailTab; label: string }[] = [
  { tab: 'conteudo', label: 'Conteúdo Programático' },
  { tab: 'caderninho', label: 'Caderninho' },
];

/** Abas de `/start?course=` (Fase 29, Caderninho de Anotações) - mesmo padrão de ProfileTabs.tsx/RankingScopeTabs. Conteúdo Programático continua o visual ATUAL (decisão do rascunho: fora de escopo reskinar essa aba agora), só ganhou o envólucro. */
export function CourseDetailTabs({ tab, onChange }: { tab: CourseDetailTab; onChange: (tab: CourseDetailTab) => void }) {
  return (
    <div className="flex gap-6 border-b border-stroke">
      {TABS.map((t) => (
        <button
          key={t.tab}
          type="button"
          onClick={() => onChange(t.tab)}
          className={`-mb-px border-b-2 pb-3 text-sm font-bold uppercase tracking-wide ${
            tab === t.tab ? 'border-accent text-primary' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
