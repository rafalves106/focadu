import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { PixelFormError } from '../components/auth/PixelFields';
import { EntryCard, EntryPitch, PixelLogo } from '../components/entry/Entry';
import { PixelButton } from '../components/session/PixelButton';
import { useAuth } from '../contexts/useAuth';
import { resolveLandingPath } from '../lib/onboarding';

const CODE_LENGTH = 6;
const VALID_MINUTES = 15;
/** Conta criada ha mais que isso caiu aqui pelo login: ganha o aviso de "agora todo mundo confirma" (quadro 05). */
const OLD_ACCOUNT_MS = 60 * 60 * 1000;

type Notice = 'wrong' | 'dead' | 'resent' | null;

const FOCADA: Record<Exclude<Notice, null> | 'waiting', string> = {
  waiting: 'Mandei um código pro seu e-mail. Abre a caixa de entrada e me conta os 6 números.',
  wrong: 'Quase! Confere os números no e-mail e tenta de novo.',
  dead: 'Esse código já era. Peço outro pra você?',
  resent: 'Código novo a caminho. Olha o e-mail de novo.',
};

/**
 * /confirmar-email (Fase 93, Figma "Verificação de e-mail — v1", pagina 256:4502): a conta existe, mas so usa o
 * app depois de digitar o codigo de 6 numeros que chegou no e-mail. Quem ja tinha conta cai aqui no proximo login
 * (decisao do dono, 08/10/2026). Ao abrir, pede o codigo sem forcar (recarregar a pagina nao manda outro e-mail);
 * "Reenviar" forca, respeitando a espera do backend.
 */
export function ConfirmEmailPage() {
  const { user, isLoading, logout, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [notice, setNotice] = useState<Notice>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const requested = useRef(false);
  const pending = !!user?.emailVerificationPending;

  useEffect(() => {
    if (!pending || requested.current) return;
    requested.current = true;
    send(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- so no 1o render com a sessao pendente
  }, [pending]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!pending) return <Navigate to="/" replace />;

  const code = digits.join('');
  const isOldAccount = Date.now() - new Date(user.createdAt).getTime() > OLD_ACCOUNT_MS;

  async function send(force: boolean) {
    setError(null);
    try {
      const status = await api.sendEmailVerification(force);
      if (status.alreadyVerified) {
        await finish(await api.getCurrentUser());
        return;
      }
      setResendIn(status.resendInSeconds);
      if (force && status.sent) {
        setDigits(Array(CODE_LENGTH).fill(''));
        setNotice('resent');
        inputs.current[0]?.focus();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não deu pra mandar o código agora. Tente de novo em instantes.');
    }
  }

  async function finish(updated: typeof user) {
    if (!updated) return;
    setCurrentUser(updated);
    navigate(await resolveLandingPath(updated), { replace: true });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (notice === 'dead') {
      await send(true);
      return;
    }
    if (code.length !== CODE_LENGTH) return;

    setBusy(true);
    setError(null);
    try {
      await finish(await api.confirmEmailVerification(code));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'codigo_invalido') setNotice('wrong');
      else if (err instanceof ApiError && (err.code === 'codigo_expirado' || err.code === 'codigo_bloqueado')) setNotice('dead');
      else setError(err instanceof ApiError ? err.message : 'Não deu pra conferir o código. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function fill(from: number, text: string) {
    const typed = text.replace(/\D/g, '');
    if (!typed) return;
    const next = [...digits];
    let index = from;
    for (const digit of typed) {
      if (index >= CODE_LENGTH) break;
      next[index++] = digit;
    }
    setDigits(next);
    if (notice === 'wrong' || notice === 'resent') setNotice(null);
    inputs.current[Math.min(index, CODE_LENGTH - 1)]?.focus();
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    fill(index, e.clipboardData.getData('text'));
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const dead = notice === 'dead';
  const boxBorder = notice === 'wrong' ? 'border-alert' : 'border-stroke focus:border-accent';
  const resendLabel = `Reenviar em ${Math.floor(resendIn / 60)}:${String(resendIn % 60).padStart(2, '0')}`;

  return (
    <div className="flex min-h-dvh items-center bg-base px-4 py-8 sm:px-10 lg:px-24">
      <div className="mx-auto flex w-full max-w-[1250px] flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="hidden lg:block">
          <EntryPitch expression={notice === 'resent' ? 'comemorando' : notice ? 'acolhedora' : 'neutra'} focada={FOCADA[notice ?? 'waiting']} />
        </div>

        <div className="flex flex-col gap-4 lg:hidden">
          <PixelLogo scale={6} />
        </div>

        <EntryCard className="w-full lg:w-[536px] lg:shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="font-pixel-label text-[8px] text-accent">Último passo</p>
              <h1 className="font-pixel-label text-[18px] leading-tight text-primary">Confira seu e-mail</h1>
            </div>

            {isOldAccount && (
              <p className="border-2 border-accent bg-accent/[0.08] px-3 py-2.5 font-pixel text-xl leading-tight text-primary">
                Agora a gente confirma o e-mail de todo mundo. É uma vez só, e seu progresso continua igual.
              </p>
            )}

            <p className="font-pixel text-[22px] leading-tight text-secondary">
              Mandamos um código de 6 números para:
              <br />
              <span className="text-primary">{user.email}</span>
            </p>

            <div data-guia="confirmar-codigo" className="flex flex-col gap-2">
              <span className="font-pixel-label text-[8px] text-secondary">Código do e-mail</span>
              <div className="grid grid-cols-6 gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(e) => fill(index, e.target.value.slice(-1))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={(e) => handlePaste(index, e)}
                    disabled={dead}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    autoFocus={index === 0}
                    maxLength={1}
                    aria-label={`Número ${index + 1} de ${CODE_LENGTH}`}
                    aria-invalid={notice === 'wrong'}
                    className={`h-14 w-full border-2 bg-surface text-center font-pixel-label text-[20px] text-primary outline-none disabled:opacity-40 ${boxBorder}`}
                  />
                ))}
              </div>
              <p className="font-pixel text-lg leading-none text-secondary">O código vale por {VALID_MINUTES} minutos. Olhe também o spam.</p>
            </div>

            {notice === 'wrong' && <PixelFormError>Esse código não confere. Olhe o e-mail e tente de novo.</PixelFormError>}
            {dead && <PixelFormError>Esse código não vale mais. Peça um código novo pra continuar.</PixelFormError>}
            {notice === 'resent' && <p className="font-pixel text-lg leading-snug text-accent">Mandamos um código novo. O anterior não vale mais.</p>}
            <PixelFormError>{error}</PixelFormError>

            <PixelButton type="submit" disabled={busy || (dead ? resendIn > 0 : code.length !== CODE_LENGTH)} className="w-full">
              {dead ? (resendIn > 0 ? resendLabel : 'Mandar código novo') : busy ? 'Conferindo...' : 'Confirmar'}
            </PixelButton>

            <div className="flex items-center justify-between gap-3">
              {dead ? (
                <span />
              ) : resendIn > 0 ? (
                <span className="font-pixel-label text-[9px] text-secondary">{resendLabel}</span>
              ) : (
                <button type="button" onClick={() => send(true)} className="font-pixel-label text-[9px] text-accent hover:brightness-125">
                  Reenviar código
                </button>
              )}
              <button type="button" onClick={handleLogout} className="font-pixel-label text-[9px] text-secondary hover:text-primary">
                Sair e usar outra conta
              </button>
            </div>
          </form>
        </EntryCard>
      </div>
    </div>
  );
}
