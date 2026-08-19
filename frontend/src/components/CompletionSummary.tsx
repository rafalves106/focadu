import { Link } from 'react-router-dom';
import type { CompleteDailyResult } from '../api/types';

/**
 * Tela pos-conclusao de POST .../complete. Reforco diario/semanal, quando existe, ja foi
 * disparado antes (durante alguma resposta anterior) - aqui so avisamos e damos um jeito de
 * navegar ate a sessao de reforco (via /hoje?daily=, ver TodayPage).
 */
export function CompletionSummary({ result }: { result: CompleteDailyResult }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">✅</p>
      <h1 className="text-2xl font-semibold text-primary">Sessão concluída!</h1>

      {result.dailyReinforcementTriggered && result.reinforcementDailyId && (
        <div className="w-full rounded-xl border border-alert bg-alert/10 p-4 text-left">
          <p className="font-semibold text-alert">Sessão de reforço gerada</p>
          <p className="mt-1 text-sm text-secondary">
            Você errou demais hoje - uma sessão extra de ~15 minutos foi criada pra reforçar o que não pegou.
          </p>
          <Link
            to={`/hoje?daily=${result.reinforcementDailyId}`}
            className="mt-3 inline-block rounded-lg bg-alert px-4 py-2 font-semibold text-base"
          >
            Ir para a sessão de reforço
          </Link>
        </div>
      )}

      {result.weeklyReinforcementTriggered && (
        <div className="w-full rounded-xl border border-surface-alt bg-surface p-4 text-left">
          <p className="font-semibold text-primary">Revisão semanal registrada</p>
          <p className="mt-1 text-sm text-secondary">
            Você acumulou dias fracos suficientes essa semana - uma revisão semanal foi registrada.
          </p>
          <Link to={`/start?weekly=${result.daily.weeklyId}`} className="mt-3 inline-block text-sm text-accent hover:underline">
            Ver a semana
          </Link>
        </div>
      )}

      <Link to="/start" className="mt-2 text-sm text-secondary hover:text-accent">
        Voltar ao início
      </Link>
    </div>
  );
}
