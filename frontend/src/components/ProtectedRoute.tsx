import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { Centered } from './Layout';

/**
 * Guarda de rota (Fase 12) - envolve as rotas que exigem sessao (/hoje, /start, /admin/conteudo).
 * So le o state ja carregado por AuthProvider (nunca busca de novo sozinho). Backend continua sem
 * `[Authorize]` nesses endpoints por enquanto (ver Program.cs) - essa guarda e so do lado do
 * cliente, a Fase 13 e quem decide se/como o backend passa a exigir isso tambem.
 */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Centered text="Carregando..." />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
