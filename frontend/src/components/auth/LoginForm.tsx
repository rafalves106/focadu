import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { isValidEmail } from '../../lib/validation';
import { PixelButton } from '../session/PixelButton';
import { PixelFormError, PixelPasswordField, PixelTextField } from './PixelFields';

/**
 * Login (Fase 12). Pixel art desde 24/09/2026 no SessionExpiredModal e, na Fase 74, tambem na tela de
 * login (a variante antiga saiu). Reautenticar so atualiza `user` no AuthContext, nunca navega.
 */
export function LoginForm({
  onSuccess,
  submitLabel = 'Entrar no cockpit',
}: {
  onSuccess: (user: UserDto) => void;
  /** Fase 22 (SessionExpiredModal): mesmo form, CTA "Retomar sessão". */
  submitLabel?: string;
}) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Informe um email válido.');
      return;
    }
    if (!password) {
      setError('Informe sua senha.');
      return;
    }

    setBusy(true);
    try {
      onSuccess(await login({ email: email.trim(), password }));
    } catch (err) {
      // credenciais_invalidas (401) chega aqui com a mensagem generica que o backend ja escolheu
      // de proposito (nunca diz se foi o email ou a senha) - so repassamos.
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar - tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PixelTextField label="Endereço de e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
      <PixelPasswordField label="Senha de acesso" value={password} onChange={setPassword} autoComplete="current-password" />
      <PixelFormError>{error}</PixelFormError>
      <PixelButton type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? 'Entrando...' : submitLabel}
      </PixelButton>
    </form>
  );
}
