import { useNavigate } from 'react-router-dom';
import { ErrorLayout } from './ErrorLayout';

/**
 * Erro generico / catch-all (Fase 10) - HTTP 5xx, excecao inesperada no frontend
 * (`ErrorBoundary.tsx`), ou qualquer coisa que nao caiu em Sem Conexao/Timeout. "Reportar" do
 * design/prompt fica de fora - marcado como "futuro" no proprio prompt, sem destino real
 * (mailto/formulario) pra apontar ainda.
 */
export function GenericError({ status, onRetry }: { status?: number; onRetry: () => void }) {
  const navigate = useNavigate();

  return (
    <ErrorLayout
      icon="❌"
      caption={status ? `ERRO ${status}` : undefined}
      title="Algo Deu Errado"
      description="Desculpe, ocorreu um erro. Tente novamente em instantes."
      primaryAction={{ label: 'Tentar Novamente', onClick: onRetry }}
      secondaryAction={{ label: 'Voltar ao Início', onClick: () => navigate('/start') }}
    />
  );
}
