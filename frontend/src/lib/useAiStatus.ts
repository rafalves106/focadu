import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AiProviderStatusDto } from '../api/types';

// Mesma janela de cache (45s) que GroqHealthCheckService usa no backend - checar mais rapido que
// isso so bateria sempre no mesmo valor ja cacheado, sem detectar nada mais cedo de verdade.
const POLL_INTERVAL_MS = 45_000;

// Tempo minimo do estado "consultando" (24/09/2026): a resposta costuma voltar em milissegundos, e o
// icone animado do menu (robozinho consultando) precisa aparecer o suficiente pra ser visto.
const MIN_CHECKING_MS = 1200;

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
 * pro menu do usuario (`UserMenu`); desde 24/09/2026 quem monta o hook e o icone de IA do nav
 * (`AiStatusMenu`). `checking` = consulta em andamento (inclusive o polling), pro icone animar.
 */
export function useAiStatus() {
  const [providers, setProviders] = useState<AiProviderStatusDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Comeca em true: a 1a consulta dispara na montagem, sem precisar ligar o estado dentro do efeito.
  const [checking, setChecking] = useState(true);

  const fetchStatus = useCallback((started: number) => {
    api
      .getAiProviderStatus()
      .then((result) => {
        setProviders(result);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setTimeout(() => setChecking(false), Math.max(0, MIN_CHECKING_MS - (Date.now() - started))));
  }, []);

  const refresh = useCallback(() => {
    setChecking(true);
    fetchStatus(Date.now());
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus(Date.now());
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus, refresh]);

  const health: AiHealth = loadFailed ? 'unknown' : overallHealth(providers);
  return { providers, loadFailed, health, checking, refresh };
}

export type AiStatus = ReturnType<typeof useAiStatus>;
