import { useNavigate } from 'react-router-dom';
import { ErrorLayout } from './ErrorLayout';

/**
 * Timeout (Fase 10) - a requisicao nao respondeu dentro do limite (`AbortSignal.timeout`, ver
 * `request()` em api/client.ts - 10s por padrao). Nao bloqueia: "Continuar Esperando" e um retry
 * manual de verdade (a requisicao anterior ja foi abortada - nao ha como "estender" um fetch morto,
 * so refazer), "Voltar" cancela e navega pra rota anterior.
 */
export function TimeoutError({ onRetry }: { onRetry: () => void }) {
  const navigate = useNavigate();

  return (
    <ErrorLayout
      icon="⏱️"
      title="Carregamento Lento"
      description="A requisição está demorando mais do que o esperado. Pode ser um problema de conexão ou o servidor pode estar ocupado."
      extra={<div className="size-8 animate-spin rounded-full border-2 border-surface-alt border-t-accent" aria-hidden="true" />}
      primaryAction={{ label: 'Continuar Esperando', onClick: onRetry }}
      secondaryAction={{ label: 'Voltar', onClick: () => navigate(-1) }}
    />
  );
}
