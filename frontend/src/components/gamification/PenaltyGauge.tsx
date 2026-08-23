/**
 * Conta-giros de penalidade (Fase 15) - PenaltyPoints atual sobre PenaltyThreshold, mesma
 * linguagem visual do ProgressBar (trilho + preenchimento arredondado, Fase 8) - só que
 * representando risco em vez de avanço, por isso um componente próprio em vez de reaproveitar
 * ProgressBar direto (a cor aqui muda por faixa, não é uma tonalidade fixa por chamador). Sobe de
 * cor conforme se aproxima do limite: neutro (0) → amarelo (1) → laranja (2) → vermelho (limite
 * atingido - reforço dispara). Elemento discreto no HUD da sessão (ver TodayPage), atualizado a
 * cada resposta de atividade junto com o resto do estado da Daily.
 */
export function PenaltyGauge({ penaltyPoints, penaltyThreshold }: { penaltyPoints: number; penaltyThreshold: number }) {
  const ratio = penaltyThreshold > 0 ? penaltyPoints / penaltyThreshold : 0;
  const tone =
    penaltyPoints <= 0
      ? { fill: 'bg-muted', text: 'text-secondary' }
      : ratio >= 1
        ? { fill: 'bg-alert shadow-[0_0_8px_rgba(255,59,59,0.5)]', text: 'text-alert' }
        : ratio >= 2 / 3
          ? { fill: 'bg-project shadow-[0_0_8px_rgba(255,184,0,0.5)]', text: 'text-project' }
          : { fill: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]', text: 'text-yellow-400' };

  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-stroke bg-surface px-3 py-1.5"
      title="Pontos de penalidade hoje"
    >
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-alt">
        <span className={`block h-full rounded-full transition-all ${tone.fill}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`text-xs font-bold tabular-nums ${tone.text}`}>
        {penaltyPoints}/{penaltyThreshold}
      </span>
    </div>
  );
}
