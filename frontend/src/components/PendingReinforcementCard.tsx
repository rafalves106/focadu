import { Link } from 'react-router-dom';

/**
 * Botao "Ir para a sessao de reforco" (Fase 56, pedido do dono, 21/09/2026) - fica visivel enquanto
 * existir uma Daily de reforco nao concluida (`DailyStateDto.pendingReinforcementDailyId`, vindo de
 * GET /api/today). Ate aqui o unico caminho ate um reforco era o link da `CompletionSummary`, que
 * aparece uma vez so, logo ao concluir a Daily de origem: se o aluno saisse dali, ou o clique
 * falhasse, nao havia como voltar (nem a trilha nem a semana listam reforcos). Mesma linguagem
 * visual do aviso "Sessao de reforco gerada" da `CompletionSummary`.
 *
 * `resume` = a sessao de reforco ja esta em andamento (e o que "Hoje" retoma) - so troca o texto.
 */
export function PendingReinforcementCard({ dailyId, resume = false }: { dailyId: string; resume?: boolean }) {
  return (
    <div className="w-full rounded-xl border border-alert bg-alert/10 p-4 text-left">
      <p className="font-semibold text-alert">Sessão de reforço pendente</p>
      <p className="mt-1 text-sm text-secondary">
        Uma sessão extra de ~15 minutos repete só o que não pegou. Este aviso fica aqui até você concluí-la.
      </p>
      <Link to={`/hoje?daily=${dailyId}`} className="mt-3 inline-block rounded-lg bg-alert px-4 py-2 font-semibold text-base">
        {resume ? 'Continuar a sessão de reforço' : 'Ir para a sessão de reforço'}
      </Link>
    </div>
  );
}
