import { useState } from 'react';
import { api } from '../../api/client';
import { StreakIndicator } from './StreakIndicator';

/**
 * "Erro - Streak Perdido" (Fase 10, node Figma 13-1040, nunca construida - ver
 * docs/fase-10/resumo-implementacao-fase-10.md e docs/fase-14, "Duvidas ou pontos abertos").
 * Streak virou dado real na Fase 14 (`UserStreak`); esta fase retoma a tela dedicada agora que
 * `GamificationSummaryDto.streakJustBroken` existe (Fase 10, retomada - ver
 * `UserStreak.CurrentStreakAsOf`/`BrokenAt`).
 *
 * Disparada pelo `StartDashboard` no load quando `streakJustBroken` vem true; `onClose` sempre
 * chama `api.acknowledgeStreakBreak()` antes de fechar (clique no botao OU no fundo) - "marcar
 * como visto" pra nao repetir a tela na proxima visita, o mesmo motivo de nao ter um "X"/"depois"
 * separado que so fecha sem reconhecer.
 *
 * Chrome de modal (fixed inset-0 + card), mesmo padrao de PublicationModal (Fase 11) e
 * SessionExpiredModal (Fase 22) - `ErrorLayout` pressupoe `min-h-screen`, incompativel com
 * sobrepor o dashboard que continua vivo por baixo. "Streak Atual" reaproveita `StreakIndicator`
 * tal qual (currentStreak=0, mesmo componente do header) em vez de reinventar o pill.
 */
export function StreakLostModal({ longestStreak, onClose }: { longestStreak: number; onClose: () => void }) {
  const [busy, setBusy] = useState(false);

  async function acknowledgeAndClose() {
    if (busy) return;
    setBusy(true);
    try {
      await api.acknowledgeStreakBreak();
    } catch {
      // "Marcar como visto" e melhor esforco - uma falha de rede aqui nao pode travar o usuario
      // numa tela que ele ja esta tentando fechar; na pior hipotese a tela repete na proxima visita.
    } finally {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" onClick={acknowledgeAndClose} role="presentation">
      <div
        className="flex w-[420px] flex-col items-center gap-6 rounded-2xl border border-surface-alt bg-surface p-8 text-center"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Streak perdido"
      >
        <span
          className="flex size-14 items-center justify-center rounded-full border-2 border-alert bg-alert/10 text-2xl"
          aria-hidden="true"
        >
          🔥
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-primary">Você Perdeu Seu Streak</h1>
          <p className="text-sm text-secondary">Sem problema, todo mundo tropeça. O importante é recomeçar hoje.</p>
        </div>

        <div className="flex w-full items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Melhor Streak</p>
            <p className="text-lg font-bold text-primary">
              {longestStreak} {longestStreak === 1 ? 'dia' : 'dias'}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Streak Atual</p>
            <StreakIndicator currentStreak={0} />
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={acknowledgeAndClose}
          className="w-full rounded-xl bg-accent px-8 py-4 text-sm font-bold tracking-wide text-base disabled:opacity-50"
        >
          COMEÇAR NOVO STREAK
        </button>
      </div>
    </div>
  );
}
