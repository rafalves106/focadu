import { useEffect, useState, type ReactNode } from 'react';
import { api, setSessionExpiredHandler } from '../api/client';
import type { LoginRequest, RegisterRequest, UserDto } from '../api/types';
import { SessionExpiredModal } from '../components/auth/SessionExpiredModal';
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
 *
 * Fase 22: tambem e a fonte de "sessao expirou EM SEGUNDO PLANO" (401 "nao_autenticado" numa
 * chamada feita depois do boot, ver api/client.ts). `sessionExpired` e um state SEPARADO de
 * `user` de proposito - nunca limpa `user` sozinho: fazer isso desmontaria toda rota atras de
 * `ProtectedRoute` (Navigate pra /login), exatamente o que a Fase 22 pede pra evitar ("aparece por
 * cima da rota atual, sem perder a URL"). `SessionExpiredModal` fica montado como IRMAO de
 * `children`, nao dentro de nenhuma rota - sobrevive a qualquer navegacao/erro de render local.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    api
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // request() (api/client.ts) roda fora da arvore React - o unico jeito de uma funcao pura avisar
  // este componente e um callback modulo-level registrado aqui. So 1 assinante existe (o Provider
  // raiz), entao um handler simples basta - nao vale um pub-sub de verdade pra isso.
  useEffect(() => {
    setSessionExpiredHandler(() => setSessionExpired(true));
    return () => setSessionExpiredHandler(null);
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
      // Defensivo: uma requisicao concorrente pode 401 bem no instante do logout intencional e
      // deixar `sessionExpired` true a toa - sem isso o modal ficaria preso por cima da tela de
      // login (ele e irmao das rotas, uma navegacao pra /login nao o desmonta sozinho).
      setSessionExpired(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
      {sessionExpired && <SessionExpiredModal onClose={() => setSessionExpired(false)} />}
    </AuthContext.Provider>
  );
}
