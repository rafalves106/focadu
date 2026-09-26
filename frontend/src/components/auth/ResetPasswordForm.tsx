import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import { MIN_PASSWORD_LENGTH } from '../../lib/validation';
import { PixelButton } from '../session/PixelButton';
import { PixelFormError, PixelPasswordField } from './PixelFields';

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PixelPasswordField label="Nova senha" value={password} onChange={setPassword} autoComplete="new-password" shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
      <PixelPasswordField label="Confirmar nova senha" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
      <PixelFormError>{error}</PixelFormError>
      <PixelButton type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? 'Salvando...' : 'Salvar senha'}
      </PixelButton>
    </form>
  );
}
