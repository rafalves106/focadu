import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { isValidEmail } from '../../lib/validation';
import { PixelButton } from '../session/PixelButton';
import { PixelFormError, PixelTextField } from './PixelFields';

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PixelTextField label="Endereço de e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
      <PixelFormError>{error}</PixelFormError>
      <PixelButton type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? 'Enviando...' : 'Enviar link'}
      </PixelButton>
    </form>
  );
}
