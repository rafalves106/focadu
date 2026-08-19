import { ApiError } from '../api/client';

export type ApiFailureType = 'noConnection' | 'timeout' | 'serverError' | 'notFound' | 'generic';

/**
 * Erro classificado (Fase 10) - nao confundir com a classe `ApiError` (api/client.ts), que e o
 * que de fato e lancado/pego num catch. `ApiFailure` e o resultado de classificar esse erro (ou
 * qualquer outro) numa das 5 categorias que as telas de erro sabem renderizar.
 */
export interface ApiFailure {
  type: ApiFailureType;
  message: string;
  status?: number;
}

/**
 * Classifica qualquer erro pego num catch de fetch/`ApiError` (ver `request()` em api/client.ts)
 * numa `ApiFailure` tipada, pras 4 telas de erro (Fase 10, `components/errors/`).
 */
export function classifyApiError(err: unknown): ApiFailure {
  // `request()` usa AbortSignal.timeout() (ver api/client.ts) - por especificacao, isso rejeita
  // com "TimeoutError" (nao "AbortError", que e so pra cancelamento manual via AbortController -
  // este app nunca cancela uma requisicao assim).
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return { type: 'timeout', message: 'A requisição demorou mais do que o esperado.' };
  }

  // fetch so lanca TypeError quando a rede falha de verdade (servidor fora do ar, CORS, sem
  // internet) - nunca por causa de um status HTTP de erro (isso vira ApiError, abaixo). Mesmo
  // tratamento se o navegador ja sabe que esta offline.
  if (!navigator.onLine || err instanceof TypeError) {
    return { type: 'noConnection', message: 'Não foi possível conectar ao servidor.' };
  }

  if (err instanceof ApiError) {
    if (err.status >= 500) return { type: 'serverError', message: err.message, status: err.status };
    if (err.status === 404) return { type: 'notFound', message: err.message, status: err.status };
    return { type: 'generic', message: err.message, status: err.status };
  }

  return { type: 'generic', message: err instanceof Error ? err.message : 'Erro inesperado.' };
}
