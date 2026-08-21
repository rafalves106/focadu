import type { RankingScope } from '../../api/types';

const TABS: { scope: RankingScope; label: string }[] = [
  { scope: 'weekly', label: 'Semana' },
  { scope: 'monthly', label: 'Mês' },
  { scope: 'course', label: 'Curso' },
];

/**
 * Alternador de recorte do ranking (Fase 16) - mesmo padrão de abas do LoginPage
 * (Entrar/Criar Conta), reaproveitado aqui em vez de inventar outro componente de tab.
 */
export function RankingScopeTabs({ scope, onChange }: { scope: RankingScope; onChange: (scope: RankingScope) => void }) {
  return (
    <div className="flex gap-6 border-b border-surface-alt">
      {TABS.map((tab) => (
        <button
          key={tab.scope}
          type="button"
          onClick={() => onChange(tab.scope)}
          className={`-mb-px border-b-2 pb-3 text-sm font-bold uppercase tracking-wide ${
            scope === tab.scope ? 'border-accent text-primary' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
