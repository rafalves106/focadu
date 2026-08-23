import type { RankingEntryDto } from '../../api/types';
import { nameColorClass } from '../../lib/cosmeticStyle';

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Lista dos primeiros colocados de um ranking (Fase 16) - destaca `highlightUserId` (o próprio usuário) quando ele aparece no top N. */
export function RankingTable({ entries, highlightUserId }: { entries: RankingEntryDto[]; highlightUserId: string }) {
  if (entries.length === 0) {
    return <p className="rounded-2xl border border-stroke bg-surface p-6 text-center text-sm text-secondary">Ninguém pontuou neste recorte ainda.</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.userId}
          className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
            entry.userId === highlightUserId ? 'border-accent bg-accent/15' : 'border-stroke bg-surface'
          }`}
        >
          <span className="w-8 shrink-0 text-center text-sm font-bold text-secondary">{MEDAL[entry.position] ?? entry.position}</span>
          <span className={`min-w-0 flex-1 truncate font-semibold ${nameColorClass(entry.equippedNameColor)}`}>
            {entry.displayName}
            {entry.userId === highlightUserId && <span className="ml-2 text-xs font-normal text-accent">(você)</span>}
          </span>
          <span className="shrink-0 font-mono text-sm font-bold text-primary">{entry.score.toFixed(1)}</span>
        </li>
      ))}
    </ol>
  );
}
