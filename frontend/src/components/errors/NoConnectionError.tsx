import { ErrorLayout } from './ErrorLayout';

/**
 * Sem conexao com o servidor (Fase 10, design Figma "Erro - Sem Conexao") - `fetch` falhou de
 * verdade (TypeError, offline) - ver `classifyApiError` em lib/apiError.ts.
 *
 * "Modo Offline" do design/prompt fica de fora de proposito - o app nao tem cache local (pedido
 * explicito do prompt: "atualmente nao ha cache local... apenas Sem Conexao + Tentar Novamente").
 */
export function NoConnectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorLayout
      caption="Sem sinal"
      title="Sem conexão com o servidor"
      description="Perdi o sinal com o servidor, agente. Confere sua internet e tenta de novo."
      primaryAction={{ label: 'Tentar de novo', onClick: onRetry }}
    />
  );
}
