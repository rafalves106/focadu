import { useNavigate } from 'react-router-dom';
import { ErrorLayout } from './ErrorLayout';

/**
 * Estado vazio (Fase 10) - quando uma listagem carregou com sucesso mas nao tem nada (ex:
 * nenhuma semana cadastrada ainda). Diferente das outras 3 telas de erro: nao vem de
 * `useApiResource.error` (a requisicao funcionou), quem chama decide quando esta "vazio"
 * (ex: `weeks.length === 0`).
 */
export function EmptyStateError({
  title = 'Nenhum conteúdo disponível',
  description = 'Ainda não há nada por aqui. Comece explorando os cursos disponíveis.',
}: {
  title?: string;
  description?: string;
}) {
  const navigate = useNavigate();

  return (
    <ErrorLayout
      icon="📦"
      title={title}
      description={description}
      primaryAction={{ label: 'Explorar Cursos', onClick: () => navigate('/start') }}
    />
  );
}
