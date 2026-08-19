import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { classifyApiError, type ApiFailure } from '../lib/apiError';

/**
 * Boilerplate de loading/error/cancelamento repetido pelas telas de /start - centralizado aqui
 * uma vez. Fase 10: `error` virou `ApiFailure` (classificado - noConnection/timeout/serverError/
 * notFound/generic, ver lib/apiError.ts) em vez de string solta, e ganhou `retry` - chamadores
 * trocam `if (error) return <Centered text={error} .../>` por
 * `if (error) return <ApiErrorScreen error={error} onRetry={retry} />` (components/errors/).
 */
export function useApiResource<T>(fetcher: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(classifyApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, error, loading, retry };
}
