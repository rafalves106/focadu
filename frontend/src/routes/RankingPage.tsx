import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { RankingScope } from '../api/types';
import { useAuth } from '../contexts/useAuth';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { HowToClimb, NextTarget, PodiumPanel, ScoreBoard } from '../components/ranking/Scoreboard';
import backArrow from '../assets/pixel/voltar.png';

const SCOPE_SUBTITLE: Record<RankingScope, string> = { weekly: 'semana atual', monthly: 'mês atual', course: 'curso inteiro' };

/**
 * Ranking do curso (Fase 16; pixel art na Fase 72, Figma "Ranking — v2", nodes 133:4503/134:6707) -
 * "placar de fliperama": podio com os agentes a esquerda, o placar HIGH SCORE (top 10) a direita e os
 * cartoes "Proximo alvo" e "Como subir". Continua ancorado na trilha (`/start?course=&ranking=1`) e no
 * mesmo endpoint, que ganhou o agente de cada pessoa e quem esta logo acima do aluno. A partir de
 * `lg`, sem rolagem externa (so o placar rola por dentro se precisar). Score de Estudo mede
 * QUALIDADE, nao quantidade - Gems altas com Score baixo e esperado.
 */
export function RankingPage({ courseId }: { courseId: string }) {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScope>('course');
  const { data, error, loading, retry } = useApiResource(() => api.getCourseRanking(courseId, scope), [courseId, scope]);
  const { data: courses } = useApiResource(() => api.getCourses(), []);
  const courseName = courses?.find((c) => c.id === courseId)?.name ?? 'Curso';

  const weekPending = scope === 'weekly' && data && !data.currentWeekScored && data.currentWeekNumber !== null;

  return (
    <div className="flex flex-col gap-4 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-8 lg:pt-8 lg:pb-10 xl:px-16 lg:short:gap-3 lg:short:pt-5 lg:short:pb-6 lg:tight:pt-4 lg:tight:pb-4">
      <header className="flex items-center justify-between gap-3 lg:shrink-0">
        <Link to={`/start?course=${courseId}`} className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent">
          <img src={backArrow} alt="" className="size-4 pixelated" />
          Voltar pra trilha
        </Link>
        <h1 className="truncate font-pixel-label text-[9px] text-muted">Ranking · {courseName}</h1>
      </header>

      {error ? (
        <ApiErrorScreen error={error} onRetry={retry} />
      ) : !data || !user ? (
        <p className="font-pixel-label text-[9px] text-secondary">{loading ? 'Carregando placar...' : ''}</p>
      ) : (
        <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-6">
          <PodiumPanel
            top={data.topEntries.filter((e) => e.position <= 3)}
            userId={user.id}
            scope={scope}
            onScope={setScope}
            notice={
              weekPending && (
                <p className="border-2 border-project/60 px-3 py-2 font-pixel text-lg leading-tight text-project">
                  Sua Semana {data.currentWeekNumber} ainda não fechou: ela entra no placar quando o projeto for avaliado.
                </p>
              )
            }
          />
          <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1 lg:short:gap-3">
            <ScoreBoard
              entries={data.topEntries}
              me={data.currentUserEntry}
              userId={user.id}
              subtitle={`Top 10 · ${courseName} · ${SCOPE_SUBTITLE[scope]}${data.totalEntries ? ` · ${data.totalEntries} agentes` : ''}`}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:shrink-0 lg:short:gap-3">
              <NextTarget me={data.currentUserEntry} ahead={data.aheadEntry} total={data.totalEntries} />
              <HowToClimb />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
