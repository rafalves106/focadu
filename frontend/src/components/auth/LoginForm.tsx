import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { isValidEmail } from '../../lib/validation';

export function LoginForm({ onSuccess }: { onSuccess: (user: UserDto) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Endereço de e-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          className="rounded-lg border border-surface-alt bg-base p-3 text-sm text-primary outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Senha de acesso</span>
        <div className="flex items-center gap-2 rounded-lg border border-surface-alt bg-base pr-3 focus-within:border-accent">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent p-3 text-sm text-primary outline-none"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="shrink-0 text-xs font-bold text-accent">
            {showPassword ? 'OCULTAR' : 'MOSTRAR'}
          </button>
        </div>
      </label>

      {error && <p className="text-sm text-alert">{error}</p>}

      <button type="submit" disabled={busy} className="mt-2 rounded-lg bg-accent py-3 text-sm font-bold text-base disabled:opacity-50">
        {busy ? 'Entrando...' : 'Entrar no Cockpit'}
      </button>
    </form>
  );
}
