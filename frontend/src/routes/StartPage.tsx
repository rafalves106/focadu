import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { App } from '../App';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { WeeklyProjectPage } from './WeeklyProjectPage';
// WorldMapPage (Fase 25, mapa/personagem) desativado por enquanto - ver comentario de StartPage
// abaixo. Import removido so por ficar sem uso (o arquivo world/WorldMapPage.tsx nao foi tocado).
import { StartDashboard } from './StartDashboard';
import { CourseDetailPage } from './CourseDetailPage';
import { WeeklyDetailPage } from './WeeklyDetailPage';
import { RankingPage } from './RankingPage';
import { CertificationsPage } from './CertificationsPage';
import { NotebookPage } from './NotebookPage';

/**
 * `/start` (Fase 25): fora do shell `<App/>` no roteador - mesmo motivo/tratamento de `/hoje`
 * desde a Fase 20 (`TodayRoute`), porque a tela sem params (`WorldMapPage`, mapa/personagem)
 * precisa ser full-bleed, sem o nav global por cima. As outras 5 sub-telas de `/start?...` ainda
 * querem o nav (Hoje/Início) - como todas moram na mesma rota (query string, nao path param),
 * quem decide "com ou sem nav" e o proprio `StartPage` chamando `<App>` manualmente (ver abaixo),
 * nao mais o roteador. `StartRoute` repoe o `<ErrorBoundary key={pathname+search}>` que `<App/>`
 * dava de graca antes (mesmo padrao de `TodayRoute` - `/start` tambem navega entre sub-telas via
 * query string sem trocar de rota).
 *
 * Com o mapa desativado (ver StartPage abaixo), toda sub-tela de `/start` hoje roda dentro de
 * `<App>` - mas o `ErrorBoundary` aqui fora continua fazendo falta (mesmo motivo de sempre), entao
 * `StartRoute` nao muda quando o mapa volta.
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
 * `/start` cobre 7 telas via query string (nao path params - ver docs/ARQUITETURA.md):
 * sem params -> StartDashboard (hub de cards, Fase 8); ?course= -> CourseDetailPage; ?course=&
 * ranking= -> RankingPage (Fase 16); ?course=&certifications= -> CertificationsPage (Fase 45);
 * ?course=&weekly= -> WeeklyDetailPage; ?course=&weekly=&daily= -> redireciona pra /hoje?daily= (Fase 74)
 * (recapitulacao simples, sem polimento - fora do escopo da Fase 8); ?course=&weekly=&project= ->
 * projeto pratico da semana (Fase 7).
 *
 * A antiga CourseListView (lista de cursos) saiu na Fase 8: como so existe 1 Course Active nesta
 * fase (mesma premissa de GET /api/today - ver docs/ARQUITETURA.md), a tela sem params vai direto
 * pro hub em vez de fazer o usuario escolher entre uma lista de 1 item so.
 *
 * Mapa/personagem (Fase 25, WorldMapPage) desativado por enquanto pro lancamento (pedido do
 * usuario, 2026-09-08) - StartDashboard volta a ser a tela sem params tanto no desktop quanto no
 * celular (antes desta mudanca, so o celular via StartDashboard - ver "Fallback mobile" no
 * historico deste arquivo). Reativar: restaurar o branch `isMobile ? StartDashboard : WorldMapPage`
 * que existia aqui (WorldMapPage e StartRoute continuam intactos, ninguem mais foi tocado).
 */
function StartPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  const weeklyId = searchParams.get('weekly');
  const dailyId = searchParams.get('daily');
  const showProject = searchParams.get('project') !== null;
  const showRanking = searchParams.get('ranking') !== null;
  // Fase 65: `?tab=` era a aba da tela do curso (Fase 29); as abas viraram telas proprias.
  const tabParam = searchParams.get('tab');
  const showCertifications = searchParams.get('certifications') !== null || tabParam === 'certificacoes';
  const showNotebook = searchParams.get('caderninho') !== null || tabParam === 'caderninho';

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
  if (showCertifications && courseId) {
    return (
      <App>
        <CertificationsPage courseId={courseId} />
      </App>
    );
  }
  if (showNotebook && courseId) {
    return (
      <App>
        <NotebookPage courseId={courseId} />
      </App>
    );
  }
  if (dailyId) return <DailyRedirect dailyId={dailyId} />;
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
  // Sem query params -> StartDashboard (hub de cards), dentro de <App> como qualquer outra sub-tela
  // - mapa (WorldMapPage) desativado por enquanto, ver comentario da funcao acima.
  return (
    <App>
      <StartDashboard />
    </App>
  );
}

/**
 * `?daily=` antigo: a recapitulacao simples de uma Daily (Fase 8) nao tinha mais nenhum link apontando
 * pra ela; desde a Fase 74 so redireciona pra sessao do dia, que ja permite rever cada etapa.
 */
function DailyRedirect({ dailyId }: { dailyId: string }) {
  return <Navigate to={`/hoje?daily=${dailyId}`} replace />;
}
