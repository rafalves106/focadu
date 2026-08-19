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
      icon="🔌"
      caption="Sem sinal"
      title="Sem Conexão com o Servidor"
      description="Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente."
      primaryAction={{ label: 'Tentar Novamente', onClick: onRetry }}
    />
  );
}
