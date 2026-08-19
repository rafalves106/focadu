import { Link } from 'react-router-dom';
import type { CompleteDailyResult } from '../api/types';

/**
 * Tela pos-conclusao de POST .../complete. Reforco diario/semanal, quando existe, ja foi
 * disparado antes (durante alguma resposta anterior) - aqui so avisamos e damos um jeito de
 * navegar ate a sessao de reforco (via /hoje?daily=, ver TodayPage).
 *
 * Fase 9 (design Figma "Resultado Final", uniformizado nas 4 atividades): o mockup mostra XP/
 * Gemas/tempo total - descartado, o dominio nao tem esses campos (ver docs/fase-9). Em vez disso,
 * um resumo real (X de Y atividades aprovadas, derivado de ActivityResponse.Passed) e um badge
 * "Conceito Dominado" quando a taxa de aprovacao do dia bate >= 90%.
 */
export function CompletionSummary({ result }: { result: CompleteDailyResult }) {
  const lastResponses = result.daily.activities.flatMap((a) => (a.responses.length > 0 ? [a.responses.at(-1)!] : []));
  const total = lastResponses.length;
  const passedCount = lastResponses.filter((r) => r.passed).length;
  const approvalRate = total > 0 ? Math.round((100 * passedCount) / total) : null;
  const mastered = approvalRate !== null && approvalRate >= 90;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-4xl">✅</p>
      <h1 className="text-2xl font-semibold text-primary">Sessão concluída!</h1>

      {approvalRate !== null && (
        <div className="flex w-full items-center justify-between rounded-2xl border border-surface-alt bg-surface p-6 text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Resultado de hoje</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {passedCount} de {total} corretas
            </p>
            {mastered && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                🏆 Conceito Dominado
              </p>
            )}
          </div>
          <div
            className={`flex size-16 shrink-0 flex-col items-center justify-center rounded-full text-lg font-bold ${
              mastered ? 'bg-accent/10 text-accent' : 'bg-surface-alt text-secondary'
            }`}
          >
            {approvalRate}%
          </div>
        </div>
      )}

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

      <div className="flex items-center gap-4">
        <Link to={`/hoje?daily=${result.daily.id}`} className="text-sm text-secondary hover:text-accent">
          Refazer este dia
        </Link>
        <Link to="/start" className="text-sm text-secondary hover:text-accent">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
