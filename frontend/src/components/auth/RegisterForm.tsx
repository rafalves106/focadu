import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '../../lib/validation';

export function RegisterForm({ onSuccess }: { onSuccess: (user: UserDto) => void }) {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Informe um email válido.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setBusy(true);
    try {
      onSuccess(await register({ email: email.trim(), password, displayName: displayName.trim() }));
    } catch (err) {
      // email_ja_cadastrado (409) e senha_muito_curta (400, redundante com a checagem acima, mas
      // o servidor nunca confia so no client-side) chegam aqui com a mensagem pronta do backend.
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar sua conta - tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Nome</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          className="rounded-lg border border-surface-alt bg-base p-3 text-sm text-primary outline-none focus:border-accent"
        />
      </label>

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
            autoComplete="new-password"
            className="min-w-0 flex-1 bg-transparent p-3 text-sm text-primary outline-none"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="shrink-0 text-xs font-bold text-accent">
            {showPassword ? 'OCULTAR' : 'MOSTRAR'}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">Confirmar senha</span>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="rounded-lg border border-surface-alt bg-base p-3 text-sm text-primary outline-none focus:border-accent"
        />
      </label>

      {error && <p className="text-sm text-alert">{error}</p>}

      <button type="submit" disabled={busy} className="mt-2 rounded-lg bg-accent py-3 text-sm font-bold text-base disabled:opacity-50">
        {busy ? 'Criando conta...' : 'Criar Conta'}
      </button>
    </form>
  );
}
