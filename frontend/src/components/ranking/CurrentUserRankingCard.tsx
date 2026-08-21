import type { RankingEntryDto } from '../../api/types';
import { nameColorClass } from '../../lib/cosmeticStyle';

/**
 * Destaque fixo da posição do usuário logado (Fase 16) - sempre visível mesmo fora do top N
 * (mesmo padrão de "sua posição" de apps de fitness/gamificação, pedido no prompt). `null` quando
 * o usuário não tem matrícula neste curso (RankingResultDto.currentUserEntry).
 */
export function CurrentUserRankingCard({ entry }: { entry: RankingEntryDto | null }) {
  if (!entry) {
    return (
      <div className="rounded-2xl border border-surface-alt bg-surface p-5 text-sm text-secondary">
        Matricule-se neste curso para aparecer no ranking.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border-[1.5px] border-accent bg-surface p-5">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
        {entry.position}º
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sua posição</p>
        <p className={`truncate font-bold ${nameColorClass(entry.equippedNameColor)}`}>{entry.displayName}</p>
      </div>
      <span className="shrink-0 font-mono text-lg font-bold text-accent">{entry.score.toFixed(1)}</span>
    </div>
  );
}
