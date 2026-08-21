import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import type { LoginRequest, RegisterRequest, UserDto } from '../api/types';
import { AuthContext } from './authContextObject';

/**
 * Fonte unica de "quem esta logado" (Fase 12) - carrega GET /api/auth/me uma vez no mount e
 * guarda em state; SplashPage e ProtectedRoute so leem esse mesmo state (nunca buscam de novo
 * sozinhos), pra nao duplicar a checagem de sessao a cada navegacao.
 *
 * 401 aqui (sem cookie / expirado) e o caminho ESPERADO de "ninguem logado ainda" - vira
 * `user: null` silenciosamente, nunca um erro pra propagar (nao ha `error` neste contexto de
 * proposito). Qualquer outra falha (rede fora do ar, 5xx) tambem cai em `user: null` - sem uma
 * sessao confirmada, o caminho seguro e sempre tratar como deslogado e deixar SplashPage mandar
 * pra /login; os proprios formularios de login/registro mostram o erro de rede se ele persistir.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(data: LoginRequest) {
    const loggedInUser = await api.login(data);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(data: RegisterRequest) {
    const registeredUser = await api.register(data);
    setUser(registeredUser);
    return registeredUser;
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}
