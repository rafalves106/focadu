import { useNavigate } from 'react-router-dom';
import { ErrorLayout } from '../components/errors/ErrorLayout';

/**
 * Guarda de segurança em `/start` (Fase 13b, design Figma "Empty State — Primeiro Acesso", node
 * 19-1648) - renderizada por StartDashboard quando `GET /api/today` devolve 404
 * `nenhuma_matricula_ativa` (usuário logado, perfil completo, mas sem nenhuma matrícula ainda -
 * ver docs/fase-13a, "Consequência direta").
 *
 * Divergência deliberada do Figma: o mockup é um dashboard cheio (streak "0 DIAS", "Sessões
 * completas 0/100%", dica pra entrar numa guilda na aba Squad, nível/gems no card do curso) -
 * nada disso existe no domínio ainda (Gems/XP/Level/Streak são a Fase 14, "Squad" não é uma rota
 * real). Reaproveita ErrorLayout (mesmo componente das 4 telas de erro/EmptyStateError) em vez de
 * reconstruir esse dashboard só com números inventados - mesmo critério já usado em
 * StartDashboard pros cards de progresso reais.
 */
export function EmptyStateStartPage() {
  const navigate = useNavigate();

  return (
    <ErrorLayout
      icon="🧭"
      title="Sua jornada ainda não começou"
      description="Você ainda não está matriculado em nenhum curso - escolha um pra desbloquear sua primeira sessão."
      primaryAction={{ label: 'Escolher meu curso', onClick: () => navigate('/selecionar-curso') }}
    />
  );
}
