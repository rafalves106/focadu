import { useState } from 'react';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { RankingScope } from '../api/types';
import { PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { RankingScopeTabs } from '../components/ranking/RankingScopeTabs';
import { RankingTable } from '../components/ranking/RankingTable';
import { CurrentUserRankingCard } from '../components/ranking/CurrentUserRankingCard';

/**
 * Ranking dos Usuários (Fase 16, tela 13 do inventário original) - ancorada em CourseDetailPage,
 * de propósito (o Documento Mestre original: "ranking fica ancorado na visualização global do
 * Course, pra não distrair o aluno durante a Daily"). Score de Estudo é métrica de QUALIDADE
 * (o quão bem), diferente de Gems (consistência/conclusão) - um usuário com Gems altas mas Score
 * baixo é possível e esperado, não é bug.
 */
export function RankingPage({ courseId }: { courseId: string }) {
  const [scope, setScope] = useState<RankingScope>('course');
  const { data, error, loading, retry } = useApiResource(() => api.getCourseRanking(courseId, scope), [courseId, scope]);

  return (
    <PageShell title="Ranking" backTo={`/start?course=${courseId}`}>
      <div className="flex flex-col gap-6">
        <RankingScopeTabs scope={scope} onChange={setScope} />

        {loading && <p className="text-sm text-secondary">Carregando ranking...</p>}
        {error && <ApiErrorScreen error={error} onRetry={retry} />}
        {data && (
          <>
            <CurrentUserRankingCard entry={data.currentUserEntry} />
            <RankingTable entries={data.topEntries} highlightUserId={data.currentUserEntry?.userId ?? ''} />
          </>
        )}
      </div>
    </PageShell>
  );
}
