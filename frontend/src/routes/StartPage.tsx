import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { App } from '../App';
import { Centered, PageShell } from '../components/Layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { WeeklyProjectPage } from './WeeklyProjectPage';
import { WorldMapPage } from './world/WorldMapPage';
import { CourseDetailPage } from './CourseDetailPage';
import { WeeklyDetailPage } from './WeeklyDetailPage';
import { RankingPage } from './RankingPage';

/**
 * `/start` (Fase 25): fora do shell `<App/>` no roteador - mesmo motivo/tratamento de `/hoje`
 * desde a Fase 20 (`TodayRoute`), porque a tela sem params (`WorldMapPage`, mapa/personagem)
 * precisa ser full-bleed, sem o nav global por cima. As outras 5 sub-telas de `/start?...` ainda
 * querem o nav (Hoje/Início) - como todas moram na mesma rota (query string, nao path param),
 * quem decide "com ou sem nav" e o proprio `StartPage` chamando `<App>` manualmente (ver abaixo),
 * nao mais o roteador. `StartRoute` repoe o `<ErrorBoundary key={pathname+search}>` que `<App/>`
 * dava de graca antes (mesmo padrao de `TodayRoute` - `/start` tambem navega entre sub-telas via
 * query string sem trocar de rota).
 */
export function StartRoute() {
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname + location.search}>
      <StartPage />
    </ErrorBoundary>
  );
}

/**
 * `/start` cobre 6 telas via query string (nao path params - ver docs/ARQUITETURA.md):
 * sem params -> WorldMapPage (mapa/personagem, Fase 25 - substitui o antigo StartDashboard de
 * cards da Fase 8; unica sem o nav do `<App/>`, ver `StartRoute` acima); ?course= ->
 * CourseDetailPage; ?course=&ranking= -> RankingPage (Fase 16); ?course=&weekly= ->
 * WeeklyDetailPage; ?course=&weekly=&daily= -> estado de uma Daily especifica (recapitulacao
 * simples, sem polimento - fora do escopo da Fase 8); ?course=&weekly=&project= -> projeto
 * pratico da semana (Fase 7).
 *
 * A antiga CourseListView (lista de cursos) saiu na Fase 8: como so existe 1 Course Active nesta
 * fase (mesma premissa de GET /api/today - ver docs/ARQUITETURA.md), a tela sem params vai direto
 * pro mapa de navegacao em vez de fazer o usuario escolher entre uma lista de 1 item so.
 */
function StartPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  const weeklyId = searchParams.get('weekly');
  const dailyId = searchParams.get('daily');
  const showProject = searchParams.get('project') !== null;
  const showRanking = searchParams.get('ranking') !== null;

  if (showProject && weeklyId) {
    return (
      <App>
        <WeeklyProjectPage weeklyId={weeklyId} courseId={courseId} />
      </App>
    );
  }
  if (showRanking && courseId) {
    return (
      <App>
        <RankingPage courseId={courseId} />
      </App>
    );
  }
  if (dailyId) {
    return (
      <App>
        <DailyView dailyId={dailyId} weeklyId={weeklyId} courseId={courseId} />
      </App>
    );
  }
  // key={weeklyId}: sem isso, "Proximo Modulo" no PublicationModal (Fase 11) so troca a query
  // string - o componente continuaria montado com o modal ainda aberto (mostrando o sucesso da
  // semana anterior por cima da semana nova). Mesmo truque de App.tsx (key={location.pathname}).
  if (weeklyId) {
    return (
      <App>
        <WeeklyDetailPage key={weeklyId} weeklyId={weeklyId} courseId={courseId} />
      </App>
    );
  }
  if (courseId) {
    return (
      <App>
        <CourseDetailPage courseId={courseId} />
      </App>
    );
  }
  // Sem query params -> mapa, full-bleed, sem <App> por proposito (ver comentario de StartRoute).
  return <WorldMapPage />;
}

/** Recapitulacao simples de uma Daily especifica - sem o polimento das telas de navegacao da Fase 8, fora de escopo aqui. */
function DailyView({
  dailyId,
  weeklyId,
  courseId,
}: {
  dailyId: string;
  weeklyId: string | null;
  courseId: string | null;
}) {
  const { data: daily, error, loading, retry } = useApiResource(() => api.getDaily(dailyId), [dailyId]);

  if (loading) return <Centered text="Carregando dia..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!daily) return null;

  const backTo = `/start?course=${courseId ?? ''}&weekly=${weeklyId ?? daily.weeklyId}`;

  return (
    <PageShell title={`Dia ${daily.dayNumber}`} backTo={backTo}>
      <p className="text-secondary">{daily.date}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {daily.activities.map((activity) => (
          <li key={activity.id} className="rounded-xl border border-surface-alt bg-surface px-4 py-3">
            <p className="text-primary">{activity.prompt ?? `Atividade tipo ${activity.type}`}</p>
            <p className="text-sm text-secondary">
              {activity.responses.length > 0
                ? `Ultima nota: ${activity.responses.at(-1)?.score}`
                : 'Ainda nao respondida'}
            </p>
          </li>
        ))}
      </ul>

      <Link to={`/hoje?daily=${dailyId}`} className="mt-4 inline-block text-sm text-accent hover:underline">
        Abrir sessão completa →
      </Link>
    </PageShell>
  );
}
