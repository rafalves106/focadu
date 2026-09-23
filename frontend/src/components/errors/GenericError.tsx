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
      caption={status ? `ERRO ${status}` : undefined}
      title="Algo deu errado"
      description="Algo quebrou do nosso lado — não foi você. Tenta de novo em instantes."
      primaryAction={{ label: 'Tentar de novo', onClick: onRetry }}
      secondaryAction={{ label: 'Voltar ao início', onClick: () => navigate('/start') }}
    />
  );
}
