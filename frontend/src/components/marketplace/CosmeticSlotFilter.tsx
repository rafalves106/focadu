import { CosmeticSlot } from '../../api/types';

const FILTERS: { slot: CosmeticSlot | null; label: string }[] = [
  { slot: null, label: 'Tudo' },
  { slot: CosmeticSlot.AvatarFrame, label: 'Molduras' },
  { slot: CosmeticSlot.NameColor, label: 'Cores' },
  { slot: CosmeticSlot.ProfileBanner, label: 'Banners' },
];

/** Filtro por slot (Fase 17) - mesmo padrão de abas do RankingScopeTabs/LoginPage. */
export function CosmeticSlotFilter({ slot, onChange }: { slot: CosmeticSlot | null; onChange: (slot: CosmeticSlot | null) => void }) {
  return (
    <div className="flex gap-6 border-b border-stroke">
      {FILTERS.map((filter) => (
        <button
          key={filter.label}
          type="button"
          onClick={() => onChange(filter.slot)}
          className={`-mb-px border-b-2 pb-3 text-sm font-bold uppercase tracking-wide ${
            slot === filter.slot ? 'border-accent text-primary' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
