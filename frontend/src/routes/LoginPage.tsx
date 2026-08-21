import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { UserDto } from '../api/types';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/useAuth';
import { resolveLandingPath } from '../lib/onboarding';

type Mode = 'login' | 'register';

/**
 * /login (Fase 12, design Figma "Login/Registro") - abas Entrar/Criar Conta na mesma tela.
 *
 * O painel esquerdo (marketing) e so decorativo, mantendo a estetica "cockpit" ja usada desde a
 * Fase 11 - mas o rodape do Figma com telemetria falsa ("System stable / latency: 14ms") e os
 * botoes de GitHub/Google nao foram construidos aqui: nao ha login social nem monitoramento real
 * no backend (spec desta fase e so email+senha), ver docs/fase-12/resumo-implementacao-fase-12.md.
 * "Esqueci minha senha" tambem fica de fora (fora de escopo, explicito no prompt) - omitido, nao
 * deixado como link que nao leva a lugar nenhum.
 */
export function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  // Fase 17: /login?ref=CODIGO (link de indicacao) - pula direto pra aba de registro, ja que
  // quem clicou num link assim quase sempre quer criar conta, nao entrar numa ja existente.
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const [mode, setMode] = useState<Mode>(referralCode ? 'register' : 'login');

  // Evita a tela de login "piscar" atras da splash - so mostra o formulario depois que
  // AuthProvider ja sabe se ha sessao ou nao.
  if (isLoading) return null;
  // Sessao ja ativa (ex: voltou pro /login pelo navegador) - manda pra Splash em vez de assumir
  // /start direto, pra passar pela mesma resolveLandingPath (onboarding/selecao de curso podem
  // ainda estar pendentes).
  if (user) return <Navigate to="/" replace />;

  function handleAuthSuccess(authedUser: UserDto) {
    resolveLandingPath(authedUser).then((destination) => navigate(destination));
  }

  return (
    <div className="flex min-h-screen bg-base">
      <div className="hidden flex-1 flex-col justify-center gap-4 border-r border-surface-alt bg-surface p-16 lg:flex">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">// Cockpit study initiated</p>
        <h1 className="text-4xl font-black text-primary">FOCADU</h1>
        <p className="text-xl font-semibold text-accent">Domine cybersecurity jogando.</p>
        <p className="max-w-sm text-sm text-secondary">
          Estude fundamentos de verdade, com sessões diárias, avaliação real e um currículo guiado - sem atalho de IA
          respondendo por você.
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center p-8 sm:p-16">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <div className="flex gap-6 border-b border-surface-alt">
            <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
              Entrar
            </TabButton>
            <TabButton active={mode === 'register'} onClick={() => setMode('register')}>
              Criar Conta
            </TabButton>
          </div>

          {mode === 'login' ? (
            <>
              <p className="text-sm text-secondary">Bem-vindo de volta. Autentique-se para continuar o treinamento.</p>
              <LoginForm onSuccess={handleAuthSuccess} />
              <p className="text-center text-sm text-secondary">
                Primeira vez?{' '}
                <button type="button" onClick={() => setMode('register')} className="font-semibold text-accent hover:underline">
                  Crie sua conta
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-secondary">Leva menos de um minuto.</p>
              {referralCode && (
                <p className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
                  Você foi indicado! Código <span className="font-mono font-bold">{referralCode}</span> será aplicado ao criar sua conta.
                </p>
              )}
              <RegisterForm onSuccess={handleAuthSuccess} referralCode={referralCode} />
              <p className="text-center text-sm text-secondary">
                Já tem conta?{' '}
                <button type="button" onClick={() => setMode('login')} className="font-semibold text-accent hover:underline">
                  Entrar
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 pb-3 text-sm font-bold uppercase tracking-wide ${
        active ? 'border-accent text-primary' : 'border-transparent text-secondary hover:text-primary'
      }`}
    >
      {children}
    </button>
  );
}
