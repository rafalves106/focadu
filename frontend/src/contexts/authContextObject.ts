import { createContext } from 'react';
import type { LoginRequest, RegisterRequest, UserDto } from '../api/types';

// Objeto de contexto + tipo isolados num arquivo proprio, separado de AuthContext.tsx (o
// Provider) e useAuth.ts (o hook) - mesmo motivo de lib/statusBadge.ts: um arquivo que so exporta
// componente(s) preserva o fast refresh do Vite.
export interface AuthContextValue {
  user: UserDto | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
