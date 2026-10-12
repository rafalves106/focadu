import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

/**
 * Fase 94: so admin entra no Painel de gestao - o resto volta pro inicio sem aviso (o aluno nem ve o item no menu).
 * E so aparencia: cada rota /api/admin confere o papel no banco e responde 403 pra quem nao e admin.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/start" replace />;
  return <>{children}</>;
}
