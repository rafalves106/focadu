import { useEffect, useState } from 'react';

/** Breakpoint `lg` do Tailwind (1024px) - onde a casca da sessao passa de 1 coluna (gaveta) pra 3. */
const QUERY = '(min-width: 64rem)';

/**
 * true a partir de `lg` (Fase 68). A sessao diaria usa isso pra montar as colunas laterais OU a
 * gaveta do celular - nunca as duas, senao Caderninho e Suporte Rapido existiriam 2x na arvore (com
 * estado e requisicoes duplicados).
 */
export function useIsDesktop(): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return matches;
}
