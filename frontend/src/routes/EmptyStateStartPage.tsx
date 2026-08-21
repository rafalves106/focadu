import { useNavigate } from 'react-router-dom';
import { ErrorLayout } from '../components/errors/ErrorLayout';
import { StreakIndicator } from '../components/gamification/StreakIndicator';

/**
 * Guarda de segurança em `/start` (Fase 13b, design Figma "Empty State — Primeiro Acesso", node
 * 19-1648) - renderizada por StartDashboard quando `GET /api/today` devolve 404
 * `nenhuma_matricula_ativa` (usuário logado, perfil completo, mas sem nenhuma matrícula ainda -
 * ver docs/fase-13a, "Consequência direta").
 *
 * Fase 14: "Streak: 0 dias" do Figma virou o mesmo `StreakIndicator` real do StartDashboard, com
 * `currentStreak={0}` fixo - estado inicial neutro, sem chamada a API nenhuma (quem ainda não se
 * matriculou nunca completou uma Daily, então o streak é sempre 0 aqui por definição, sem
 * depender de round-trip). Divergência que permanece do mockup: "Sessões completas 0/100%", dica
 * pra entrar numa guilda na aba Squad, nível/gems no card do curso - nada disso existe no domínio
 * ainda (XP/Level são fora de escopo até nova ordem, "Squad" não é uma rota real). Reaproveita
 * ErrorLayout (mesmo componente das 4 telas de erro/EmptyStateError) em vez de reconstruir esse
 * dashboard só com números inventados - mesmo critério já usado em StartDashboard.
 */
export function EmptyStateStartPage() {
  const navigate = useNavigate();

  return (
    <ErrorLayout
      icon="🧭"
      title="Sua jornada ainda não começou"
      description="Você ainda não está matriculado em nenhum curso - escolha um pra desbloquear sua primeira sessão."
      primaryAction={{ label: 'Escolher meu curso', onClick: () => navigate('/selecionar-curso') }}
      extra={<StreakIndicator currentStreak={0} />}
    />
  );
}
