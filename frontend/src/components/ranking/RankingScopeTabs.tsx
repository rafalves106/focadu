import type { RankingScope } from '../../api/types';

const TABS: { scope: RankingScope; label: string }[] = [
  { scope: 'weekly', label: 'Semana' },
  { scope: 'monthly', label: 'Mês' },
  { scope: 'course', label: 'Curso' },
];

/**
 * Alternador de recorte do ranking (Fase 16) - controle segmentado (Figma "Ranking dos Usuários"),
 * era abas com sublinhado (mesmo padrão de LoginPage) - trocado na Fase 20 porque o node deste
 * ranking especificamente mostra um grupo de pilulas (bg-surface + segmento ativo accent-dim), nao
 * o padrao de aba sublinhada usado em outras telas.
 */
export function RankingScopeTabs({ scope, onChange }: { scope: RankingScope; onChange: (scope: RankingScope) => void }) {
  return (
    <div className="inline-flex gap-2 rounded-lg bg-surface p-1">
      {TABS.map((tab) => (
        <button
          key={tab.scope}
          type="button"
          onClick={() => onChange(tab.scope)}
          className={`rounded-md px-4 py-2 text-[13px] font-semibold uppercase tracking-wide ${
            scope === tab.scope
              ? 'border border-accent bg-accent/25 text-primary'
              : 'border border-transparent text-secondary hover:text-primary'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
