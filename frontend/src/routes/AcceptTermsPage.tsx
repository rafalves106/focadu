import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { PixelFormError } from '../components/auth/PixelFields';
import { EntryCard, EntryScreen } from '../components/entry/Entry';
import { LegalLink, TermsCheckbox } from '../components/legal/LegalBits';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelButton, PixelChip } from '../components/session/PixelButton';
import { useAuth } from '../contexts/useAuth';
import { LEGAL_VERSION } from '../lib/legal';
import { resolveLandingPath } from '../lib/onboarding';

/**
 * /aceite (Fase 102, Figma "Termos e Privacidade — v1", quadros 21-26): tela inteira, sem GlobalNav, que bloqueia o
 * app ate o aluno aceitar a versao vigente - contas anteriores a Fase 102 e qualquer subida de LEGAL_VERSION. Fora do
 * <ProtectedRoute/> (que manda pra ca); quem nao precisa aceitar nada e devolvido ao fluxo normal.
 */
export function AcceptTermsPage() {
  const { user, isLoading, logout, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerificationPending) return <Navigate to="/confirmar-email" replace />;
  if (!user.termsAcceptancePending) return <Navigate to="/" replace />;

  async function handleAccept() {
    if (!checked) {
      setMissing(true);
      setError('Marque a caixa para continuar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.acceptTerms(LEGAL_VERSION);
      setCurrentUser(updated);
      navigate(await resolveLandingPath(updated), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'termos_desatualizados') {
        // O texto mudou depois que a tela abriu: recarrega pra mostrar (e o aluno aceitar) a versao nova.
        window.location.reload();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Sem conexão. Confira sua internet e tente de novo.');
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <EntryScreen>
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-20">
        <EntryCard className="w-full max-w-[520px]">
          <PixelChip tone="project">{`Nova versão · ${LEGAL_VERSION}`}</PixelChip>
          <h1 className="font-pixel text-[34px] leading-none text-primary">Atualizamos nossos termos.</h1>
          <FocadaSays expression="neutra" size="sm">
            Antes de seguir, agente: dá uma olhada nos termos e me diz se está tudo certo.
          </FocadaSays>
          <p className="font-pixel text-xl leading-tight text-secondary">
            Leia <LegalLink doc="termos">os Termos de Uso</LegalLink> e <LegalLink doc="privacidade">a Política de Privacidade</LegalLink>. Seu progresso fica guardado.
          </p>
          <TermsCheckbox
            checked={checked}
            onChange={(v) => {
              setChecked(v);
              if (v) {
                setMissing(false);
                setError(null);
              }
            }}
            invalid={missing}
            disabled={busy}
          />
          <PixelFormError>{error}</PixelFormError>
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <PixelButton onClick={handleAccept} disabled={busy} className="w-full sm:flex-1">
              {busy ? 'Salvando...' : 'Aceitar e continuar'}
            </PixelButton>
            <PixelButton ghost tone="muted" onClick={handleLogout} disabled={busy} className="w-full sm:w-auto">
              Sair
            </PixelButton>
          </div>
        </EntryCard>
      </div>
    </EntryScreen>
  );
}
