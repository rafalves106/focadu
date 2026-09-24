import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { isValidEmail } from '../../lib/validation';
import { pixelField } from '../PixelModal';
import { PixelButton } from '../session/PixelButton';

export function LoginForm({
  onSuccess,
  submitLabel = 'ENTRAR NO COCKPIT',
  pixel = false,
}: {
  onSuccess: (user: UserDto) => void;
  // Fase 22 (SessionExpiredModal): mesmo form, CTA "Retomar Sessão" - className ja tem `uppercase`,
  // entao o texto passado aqui nao precisa vir em caixa alta.
  submitLabel?: string;
  /** Variante pixel art (24/09/2026, SessionExpiredModal): rotulos em Silkscreen, campos em VT323 com
   * borda reta, `PixelButton`. A tela de login continua na versao antiga ate ser redesenhada. */
  pixel?: boolean;
}) {
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

  if (pixel) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-pixel-label text-[9px] text-secondary">Endereço de e-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            className={pixelField}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-pixel-label text-[9px] text-secondary">Senha de acesso</span>
          <div className="flex items-center gap-3 border-2 border-stroke bg-surface px-3 py-2 focus-within:border-accent">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent font-pixel text-xl leading-snug text-primary outline-none"
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="shrink-0 font-pixel-label text-[9px] text-accent hover:brightness-110">
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>

        {error && <p className="font-pixel text-lg leading-snug text-alert">{error}</p>}

        <PixelButton type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? 'Entrando...' : submitLabel}
        </PixelButton>
      </form>
    );
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

      <label className="flex flex-col gap-2">
        <span className="font-display text-[11px] font-bold tracking-[1.5px] text-secondary uppercase">Senha de acesso</span>
        <div className="flex items-center justify-between rounded-xl border-[1.5px] border-surface-alt bg-surface p-4 focus-within:border-accent">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="font-mono min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="font-mono shrink-0 text-xs font-semibold text-accent underline">
            {showPassword ? 'OCULTAR' : 'MOSTRAR'}
          </button>
        </div>
      </label>

      {error && <p className="font-display text-sm text-alert">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="font-display mt-2 rounded-xl bg-accent p-4 text-sm font-bold tracking-[1px] text-base uppercase disabled:opacity-50"
      >
        {busy ? 'ENTRANDO...' : submitLabel}
      </button>
    </form>
  );
}
