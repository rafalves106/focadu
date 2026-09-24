export type ProfileTab = 'info' | 'customizacao' | 'conquistas' | 'squad';

const TABS: { tab: ProfileTab; label: string; soon?: boolean }[] = [
  { tab: 'info', label: 'Informações' },
  { tab: 'conquistas', label: 'Conquistas' },
  { tab: 'customizacao', label: 'Customização', soon: true },
  { tab: 'squad', label: 'Squad' },
];

/**
 * Abas do `/perfil` (Fase 18; pixel art na Fase 70) - caixas retas de 2px, a ativa em verde. No
 * celular viram uma grade 2x2. Customizacao leva o selo "Em breve" ate a Loja abrir - some entre `sm` e 1400px,
 * onde as 4 abas nao cabem numa linha com ele (a propria aba repete o aviso).
 */
export function ProfileTabs({ tab, onChange }: { tab: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  return (
    <div role="tablist" aria-label="Seções do perfil" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:gap-1.5 min-[1400px]:gap-2">
      {TABS.map((t) => {
        const active = tab === t.tab;
        return (
          <button
            key={t.tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.tab)}
            className={`flex items-center justify-center gap-2 border-2 px-3 py-2.5 font-pixel-label text-[10px] leading-none min-[1400px]:px-4 min-[1400px]:text-[11px] ${
              active ? 'border-accent bg-surface text-accent' : 'border-stroke text-secondary hover:text-primary'
            }`}
          >
            {t.label}
            {t.soon && <span className="font-pixel-label text-[7px] text-project sm:hidden min-[1400px]:inline">Em breve</span>}
          </button>
        );
      })}
    </div>
  );
}
