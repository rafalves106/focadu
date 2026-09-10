import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AiProviderStatusDto } from '../api/types';

// Mesma janela de cache (45s) que GroqHealthCheckService usa no backend - checar mais rapido que
// isso so bateria sempre no mesmo valor ja cacheado, sem detectar nada mais cedo de verdade.
const POLL_INTERVAL_MS = 45_000;

type Health = 'ok' | 'degraded' | 'down' | 'unset' | 'unknown';

/**
 * 'unset' (nenhum provedor configurado) e distinto de 'unknown' (nao foi possivel nem consultar o
 * endpoint de status) - o primeiro e um estado valido de dev local sem chave, o segundo e a propria
 * Api parecendo fora do ar.
 */
function overallHealth(providers: AiProviderStatusDto[] | null): Health {
  if (providers === null || providers.length === 0) return 'unknown';
  if (providers.every((p) => !p.configured)) return 'unset';
  if (providers.every((p) => p.available)) return 'ok';
  if (providers.some((p) => p.available)) return 'degraded';
  return 'down';
}

const DOT_CLASS: Record<Health, string> = {
  ok: 'bg-accent',
  degraded: 'bg-project',
  down: 'bg-alert',
  unset: 'bg-muted',
  unknown: 'bg-muted',
};

const LABEL: Record<Health, string> = {
  ok: 'IA operacional',
  degraded: 'IA parcial',
  down: 'IA indisponível',
  unset: 'IA não configurada',
  unknown: 'Status da IA',
};

function providerStatusLabel(provider: AiProviderStatusDto): string {
  if (!provider.configured) return 'Não configurada';
  return provider.available ? 'Operacional' : 'Indisponível';
}

function providerStatusClass(provider: AiProviderStatusDto): string {
  if (!provider.configured) return 'text-muted';
  return provider.available ? 'text-accent' : 'text-alert';
}

/**
 * Badge persistente de status de IA (Fase 28, GlobalNav) - de relance, sinaliza se a Groq (ou
 * outra IA futura, ver IAiProviderHealthCheck no backend) esta no ar, pra ajudar a decidir quando
 * trocar a chave ou desativar uma atividade que depende dela. So-contido (busca o proprio estado,
 * nunca bloqueia o resto do nav se falhar - mesmo padrao de HeaderUserBadge) e faz polling a cada
 * 45s enquanto a aba estiver aberta (mesma janela de cache do backend).
 *
 * Clique expande um painel com o detalhe por provedor - nome, status e a mensagem de erro que o
 * backend devolveu, quando houver. Fecha só pelo próprio botão (sem listener de clique fora) -
 * mesmo idioma simples do menu suspenso mobile do GlobalNav.
 */
export function AiStatusBadge() {
  const [providers, setProviders] = useState<AiProviderStatusDto[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [open, setOpen] = useState(false);

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

  const health: Health = loadFailed ? 'unknown' : overallHealth(providers);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Status da IA"
        title={LABEL[health]}
        className="flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary"
      >
        <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[health]}`} aria-hidden="true" />
        <span className="hidden sm:inline">{LABEL[health]}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Status da IA"
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-stroke bg-surface p-3 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status da IA</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-secondary hover:text-primary">
              Fechar
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-2">
            {loadFailed && <p className="text-xs text-alert">Não foi possível consultar o status agora.</p>}
            {!loadFailed && providers === null && <p className="text-xs text-secondary">Carregando...</p>}
            {!loadFailed && providers?.length === 0 && (
              <p className="text-xs text-secondary">Nenhum provedor de IA registrado.</p>
            )}
            {providers?.map((provider) => (
              <div key={provider.provider} className="flex flex-col gap-0.5 rounded-lg bg-surface-alt px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-primary">{provider.provider}</span>
                  <span className={`text-xs font-semibold ${providerStatusClass(provider)}`}>
                    {providerStatusLabel(provider)}
                  </span>
                </div>
                {provider.errorMessage && <p className="text-[11px] text-secondary">{provider.errorMessage}</p>}
              </div>
            ))}
          </div>

          <button type="button" onClick={refresh} className="mt-2 text-xs font-semibold text-accent hover:underline">
            Verificar agora
          </button>
        </div>
      )}
    </div>
  );
}
