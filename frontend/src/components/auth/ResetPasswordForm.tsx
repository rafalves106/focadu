import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { MIN_PASSWORD_LENGTH } from '../../lib/validation';

/** Fase 41 - escolhe a nova senha e dispara /api/auth/reset-password com o token vindo da URL (ver ResetPasswordPage). token_invalido/token_expirado (400) chegam aqui com a mensagem pronta do backend. */
export function ResetPasswordForm({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

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
      await api.resetPassword({ token, newPassword: password });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha - tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Nova senha</span>
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
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Confirmar nova senha</span>
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
        {busy ? 'REDEFININDO...' : 'REDEFINIR SENHA'}
      </button>
    </form>
  );
}
