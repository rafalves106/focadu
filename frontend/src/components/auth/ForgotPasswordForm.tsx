import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { isValidEmail } from '../../lib/validation';

/** Fase 41 - pede o email e dispara /api/auth/forgot-password; a mensagem de sucesso e a mesma pra email cadastrado ou nao (o backend nunca revela isso, ver RequestPasswordResetUseCase). */
export function ForgotPasswordForm({ onSubmitted }: { onSubmitted: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Informe um email válido.');
      return;
    }

    setBusy(true);
    try {
      await api.forgotPassword({ email: email.trim() });
      onSubmitted(email.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o email - tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

      {error && <p className="font-display text-sm text-alert">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="font-display mt-2 rounded-xl bg-accent p-4 text-sm font-bold tracking-[1px] text-base uppercase disabled:opacity-50"
      >
        {busy ? 'ENVIANDO...' : 'ENVIAR LINK DE REDEFINIÇÃO'}
      </button>
    </form>
  );
}
