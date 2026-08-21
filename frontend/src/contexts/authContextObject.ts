import { createContext } from 'react';
import type { LoginRequest, RegisterRequest, UserDto } from '../api/types';

// Objeto de contexto + tipo isolados num arquivo proprio, separado de AuthContext.tsx (o
// Provider) e useAuth.ts (o hook) - mesmo motivo de lib/statusBadge.ts: um arquivo que so exporta
// componente(s) preserva o fast refresh do Vite.
export interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  // Devolvem o UserDto (Fase 13b) - quem chama (LoginForm/RegisterForm) precisa dele na hora pra
  // decidir a rota de destino (ver lib/onboarding.ts); esperar o proximo render do contexto
  // atualizar `user` seria uma corrida desnecessaria com a propria navegacao.
  login: (data: LoginRequest) => Promise<UserDto>;
  register: (data: RegisterRequest) => Promise<UserDto>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
