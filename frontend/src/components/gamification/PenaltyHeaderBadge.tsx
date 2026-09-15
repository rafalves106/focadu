import { useDailyPenalty } from '../../lib/dailyPenaltyContext';

/**
 * Contador de erros no header (Fase 36, `GlobalNav`) - substitui o antigo `PenaltyGauge` fixo
 * (`left-6 top-[72px]`, sobre o canto da tela de sessão), confundido com um contador de etapa
 * numa verificação ao vivo por ficar tão perto do `SessionTopBar`. Mesma fonte de dado
 * (`PenaltyPoints`/`DailyPenaltyThreshold`), só reposicionado + com legenda e tooltip explicando o
 * que o número significa (antes só o `title` nativo do navegador, pouco descoberto).
 *
 * `null` fora de uma sessão ativa (ver `dailyPenaltyContext`) - o próprio componente decide não
 * renderizar nada, então `GlobalNav` só precisa encaixar `<PenaltyHeaderBadge />` no lugar certo
 * sem `if` próprio.
 *
 * 🚨 é emoji (mesma linguagem visual do resto do app - nenhum GIF em lugar nenhum hoje, decisão
 * confirmada com o Falves) - pulsa (`animate-pulse`, já usado no botão de gravar do Resumo Falado)
 * só quando há pontos de penalidade; parado em 0 pra não parecer alarme falso o tempo todo.
 */
export function PenaltyHeaderBadge() {
  const penalty = useDailyPenalty();
  if (!penalty) return null;

  const { penaltyPoints, penaltyThreshold } = penalty;
  const ratio = penaltyThreshold > 0 ? penaltyPoints / penaltyThreshold : 0;
  const countColor =
    penaltyPoints <= 0
      ? 'text-secondary'
      : ratio >= 1
        ? 'text-alert'
        : ratio >= 2 / 3
          ? 'text-project'
          : 'text-yellow-400';

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-stroke bg-surface-alt py-1 pl-2 pr-1.5">
      <span className={penaltyPoints > 0 ? 'animate-pulse text-sm leading-none' : 'text-sm leading-none opacity-60'} aria-hidden="true">
        🚨
      </span>
      <span className={`text-xs font-bold tabular-nums ${countColor}`}>
        {penaltyPoints}/{penaltyThreshold}
      </span>
      <span className="hidden text-xs font-medium text-secondary sm:inline">Erros hoje</span>

      <span className="group relative flex items-center">
        <span
          tabIndex={0}
          role="button"
          aria-label="O que é o contador de erros"
          className="flex size-4 cursor-help items-center justify-center rounded-full text-[10px] font-bold text-muted outline-none hover:text-primary focus-visible:text-primary"
        >
          ⓘ
        </span>
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-stroke bg-surface p-3 text-xs leading-relaxed text-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Esse é o contador de erros de hoje - cada resposta errada soma 1 ponto. Ao chegar em{' '}
          {penaltyThreshold}, uma Daily de reforço é criada automaticamente, repetindo só as
          atividades que você errou.
        </span>
      </span>
    </div>
  );
}
