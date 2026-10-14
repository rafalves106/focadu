import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../contexts/useAuth';
import { isValidEmail, MIN_PASSWORD_LENGTH } from '../../lib/validation';
import { TermsCheckbox } from '../legal/LegalBits';
import { PixelButton } from '../session/PixelButton';
import { PixelFormError, PixelPasswordField, PixelTextField } from './PixelFields';

const INVITE_ERROR = 'Esse convite não vale mais, peça outro.';

export function RegisterForm({
  onSuccess,
  referralCode,
  inviteCode,
  onInviteRejected,
}: {
  onSuccess: (user: UserDto) => void;
  /** Fase 17: opcional - vem de /login?ref= (ver LoginPage). Codigo invalido/de ninguem so e ignorado no backend. */
  referralCode?: string | null;
  /** Fase 93: convite de tester (LoginPage); o backend e quem confere se ainda vale. */
  inviteCode?: string | null;
  /** Fase 93: o convite foi recusado no envio - a LoginPage pinta o campo do codigo de vermelho. */
  onInviteRejected?: () => void;
}) {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsMissing, setTermsMissing] = useState(false);
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

    // Fase 102 (Figma, quadro 13): o botao fica sempre clicavel e o erro aparece ao clicar sem marcar - melhor pra leitor de tela.
    if (!acceptTerms) {
      setTermsMissing(true);
      setError('Aceite os Termos de Uso e a Política de Privacidade para criar a conta.');
      return;
    }

    setBusy(true);
    try {
      onSuccess(await register({ email: email.trim(), password, displayName: displayName.trim(), referralCode: referralCode ?? undefined, inviteCode: inviteCode ?? undefined, acceptTerms }));
    } catch (err) {
      // email_ja_cadastrado (409) e senha_muito_curta (400, redundante com a checagem acima, mas
      // o servidor nunca confia so no client-side) chegam aqui com a mensagem pronta do backend.
      // Fase 93: a mesma frase pros convites que nao valem (Figma "Cadastro por convite — v3", quadro 05).
      if (err instanceof ApiError && err.code === 'termos_obrigatorios') {
        setTermsMissing(true);
        setError(err.message);
      } else if (err instanceof ApiError && err.code.startsWith('convite_')) {
        setError(INVITE_ERROR);
        onInviteRejected?.();
      }
      else setError(err instanceof ApiError ? err.message : 'Não foi possível criar sua conta - tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PixelTextField label="Nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
      <PixelTextField label="Endereço de e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
      <PixelPasswordField
        label="Senha de acesso"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        shown={showPassword}
        onToggle={() => setShowPassword((v) => !v)}
      />
      <PixelPasswordField
        label="Confirmar senha"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        shown={showPassword}
        onToggle={() => setShowPassword((v) => !v)}
      />
      <TermsCheckbox
        checked={acceptTerms}
        onChange={(v) => {
          setAcceptTerms(v);
          if (v) {
            setTermsMissing(false);
            setError(null);
          }
        }}
        invalid={termsMissing}
        disabled={busy}
      />
      <PixelFormError>{error}</PixelFormError>
      <PixelButton type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? 'Criando conta...' : 'Criar conta'}
      </PixelButton>
    </form>
  );
}
