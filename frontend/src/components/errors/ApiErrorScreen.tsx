import type { ApiFailure } from '../../lib/apiError';
import { NoConnectionError } from './NoConnectionError';
import { TimeoutError } from './TimeoutError';
import { GenericError } from './GenericError';

/**
 * Dispatcher (Fase 10) - escolhe qual das telas de erro renderizar a partir do `ApiFailure`
 * classificado (ver lib/apiError.ts). Centralizado aqui pra nao repetir o mesmo if/else de tipo em
 * cada uma das ~10 telas que usam `useApiResource` (StartDashboard, WeeklyDetailPage,
 * CourseDetailPage, etc.) - troca `if (error) return <Centered text={error} .../>` por
 * `if (error) return <ApiErrorScreen error={error} onRetry={retry} />`.
 *
 * `EmptyStateError` fica fora deste dispatcher de proposito - nao e um erro de rede/Api
 * (`useApiResource.error` so existe quando a requisicao falha), e sim uma condicao sobre os
 * dados carregados com sucesso (ex: `weeks.length === 0`) - quem chama decide isso direto.
 */
export function ApiErrorScreen({ error, onRetry }: { error: ApiFailure; onRetry: () => void }) {
  if (error.type === 'noConnection') return <NoConnectionError onRetry={onRetry} />;
  if (error.type === 'timeout') return <TimeoutError onRetry={onRetry} />;
  return <GenericError status={error.status} onRetry={onRetry} />;
}
