import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '../../lib/validation';

export function RegisterForm({
  onSuccess,
  referralCode,
}: {
  onSuccess: (user: UserDto) => void;
  /** Fase 17: opcional - vem de /login?ref= (ver LoginPage). Codigo invalido/de ninguem so e ignorado no backend. */
  referralCode?: string | null;
}) {
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
      onSuccess(await register({ email: email.trim(), password, displayName: displayName.trim(), referralCode: referralCode ?? undefined }));
    } catch (err) {
      // email_ja_cadastrado (409) e senha_muito_curta (400, redundante com a checagem acima, mas
      // o servidor nunca confia so no client-side) chegam aqui com a mensagem pronta do backend.
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar sua conta - tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Nome</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          className="font-display rounded-xl border-[1.5px] border-surface-alt bg-surface p-4 text-[15px] text-primary outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Endereço de e-mail</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          className="font-display rounded-xl border-[1.5px] border-surface-alt bg-surface p-4 text-[15px] text-primary outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Senha de acesso</span>
        <div className="flex items-center justify-between rounded-xl border-[1.5px] border-surface-alt bg-surface p-4 focus-within:border-accent">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="font-mono min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="font-mono shrink-0 text-xs font-semibold text-accent underline">
            {showPassword ? 'OCULTAR' : 'MOSTRAR'}
          </button>
        </div>
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Confirmar senha</span>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          className="font-mono rounded-xl border-[1.5px] border-surface-alt bg-surface p-4 text-[15px] text-primary outline-none focus:border-accent"
        />
      </label>

      {error && <p className="font-display text-sm text-alert">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="font-display mt-2 rounded-xl bg-accent p-4 text-sm font-bold tracking-[1px] text-base uppercase disabled:opacity-50"
      >
        {busy ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
      </button>
    </form>
  );
}
