import type { AiProviderStatusDto } from '../api/types';
import type { AiHealth, AiStatus } from '../lib/useAiStatus';

export const AI_HEALTH_DOT_CLASS: Record<AiHealth, string> = {
  ok: 'bg-accent',
  degraded: 'bg-project',
  down: 'bg-alert',
  unset: 'bg-muted',
  unknown: 'bg-muted',
};

const LABEL: Record<AiHealth, string> = {
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
 * Detalhe do status de IA (Fase 28) - resumo + nome/status/erro de cada provedor. Ate a Fase 61 era
 * um selo fixo no GlobalNav que abria este painel; desde a Fase 62 (menu do Figma, node 178:143, sem
 * o selo) mora dentro do menu do usuario (`UserMenu`), a pedido do dono. O estado vem de fora
 * (`useAiStatus`, montado pelo menu) - este componente so desenha.
 */
export function AiStatusDetails({ status }: { status: AiStatus }) {
  const { providers, loadFailed, health, refresh } = status;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full ${AI_HEALTH_DOT_CLASS[health]}`} aria-hidden="true" />
        <p className="text-xs font-semibold text-secondary">{LABEL[health]}</p>
      </div>

      {loadFailed && <p className="text-xs text-alert">Não foi possível consultar o status agora.</p>}
      {!loadFailed && providers === null && <p className="text-xs text-secondary">Carregando...</p>}
      {!loadFailed && providers?.length === 0 && <p className="text-xs text-secondary">Nenhum provedor de IA registrado.</p>}
      {providers?.map((provider) => (
        <div key={provider.provider} className="flex flex-col gap-0.5 rounded-lg bg-surface-alt px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-primary">{provider.provider}</span>
            <span className={`text-xs font-semibold ${providerStatusClass(provider)}`}>{providerStatusLabel(provider)}</span>
          </div>
          {provider.errorMessage && <p className="text-[11px] text-secondary">{provider.errorMessage}</p>}
        </div>
      ))}

      <button type="button" onClick={refresh} className="w-fit text-xs font-semibold text-accent hover:underline">
        Verificar agora
      </button>
    </div>
  );
}
