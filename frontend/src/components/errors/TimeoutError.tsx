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
      caption="Demorando"
      title="Carregamento lento"
      description="O servidor está demorando mais que o normal. Pode ser a conexão ou ele está ocupado — espera mais um pouco?"
      extra={
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-3 animate-pulse bg-accent" style={{ animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      }
      primaryAction={{ label: 'Continuar esperando', onClick: onRetry }}
      secondaryAction={{ label: 'Voltar', onClick: () => navigate(-1) }}
    />
  );
}
