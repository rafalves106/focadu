export type ProfileTab = 'info' | 'customizacao' | 'conquistas';

const TABS: { tab: ProfileTab; label: string }[] = [
  { tab: 'info', label: 'Informações' },
  { tab: 'customizacao', label: 'Customização' },
  { tab: 'conquistas', label: 'Conquistas' },
];

/** Abas do `/perfil` (Fase 18) - mesmo padrão de RankingScopeTabs/CosmeticSlotFilter, reaproveitado em vez de inventar outro componente de tab. */
export function ProfileTabs({ tab, onChange }: { tab: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  return (
    <div className="flex gap-6 border-b border-surface-alt">
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
