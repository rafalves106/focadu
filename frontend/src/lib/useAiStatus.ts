import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AiProviderStatusDto } from '../api/types';

// Mesma janela de cache (45s) que GroqHealthCheckService usa no backend - checar mais rapido que
// isso so bateria sempre no mesmo valor ja cacheado, sem detectar nada mais cedo de verdade.
const POLL_INTERVAL_MS = 45_000;

export type AiHealth = 'ok' | 'degraded' | 'down' | 'unset' | 'unknown';

/**
 * 'unset' (nenhum provedor configurado) e distinto de 'unknown' (nao foi possivel nem consultar o
 * endpoint de status) - o primeiro e um estado valido de dev local sem chave, o segundo e a propria
 * Api parecendo fora do ar.
 */
function overallHealth(providers: AiProviderStatusDto[] | null): AiHealth {
  if (providers === null || providers.length === 0) return 'unknown';
  if (providers.every((p) => !p.configured)) return 'unset';
  if (providers.every((p) => p.available)) return 'ok';
  if (providers.some((p) => p.available)) return 'degraded';
  return 'down';
}

/**
 * Status dos provedores de IA (Fase 28), com polling a cada 45s enquanto a aba estiver aberta.
 * Extraido do antigo `AiStatusBadge` na Fase 62, quando o status saiu do selo fixo do nav e foi
 * pro menu do usuario (`UserMenu`) - quem monta o hook e o menu, sempre presente no nav.
 */
export function useAiStatus() {
  const [providers, setProviders] = useState<AiProviderStatusDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const refresh = useCallback(() => {
    api
      .getAiProviderStatus()
      .then((result) => {
        setProviders(result);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const health: AiHealth = loadFailed ? 'unknown' : overallHealth(providers);
  return { providers, loadFailed, health, refresh };
}

export type AiStatus = ReturnType<typeof useAiStatus>;
