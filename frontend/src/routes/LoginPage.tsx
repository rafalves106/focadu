import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { UserDto } from '../api/types';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/useAuth';
import { resolveLandingPath } from '../lib/onboarding';
import { EntryCard, EntryPitch, PixelLogo } from '../components/entry/Entry';
import gemIcon from '../assets/pixel/gema.png';

type Mode = 'login' | 'register';

/**
 * /login (Fase 12; pixel art na Fase 74, Figma "Entrada e onboarding — v2", nodes 144:4587/144:5226/
 * 146:7373) - abas Entrar/Criar conta na mesma tela. A esquerda (so a partir de `lg`), o que e a Focadu,
 * o agente do kit basico e a Focada; a direita, o cartao com as abas e o formulario. `?ref=` (indicacao)
 * abre direto em "Criar conta" com a faixa verde do codigo.
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
    <div className="flex min-h-dvh items-center bg-base px-4 py-8 sm:px-10 lg:px-24">
      <div className="mx-auto flex w-full max-w-[1250px] flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="hidden lg:block">
          <EntryPitch
            expression={mode === 'login' ? 'neutra' : 'comemorando'}
            focada={mode === 'login' ? 'Voltou, agente? O mapa guardou seu lugar.' : 'Novo por aqui? Eu sou a Focada. Cria a conta que eu te mostro o caminho.'}
          />
        </div>

        {/* Celular: so o logo e o slogan em cima do cartao (Figma 146:7373). */}
        <div className="flex flex-col gap-4 lg:hidden">
          <p className="font-pixel-label text-[8px] text-accent">// Treino de segurança, um dia por vez</p>
          <PixelLogo scale={6} />
          <p className="font-pixel text-[28px] leading-none text-accent">Domine cybersecurity jogando.</p>
        </div>

        <EntryCard className="w-full lg:w-[536px] lg:shrink-0">
          <div className="grid grid-cols-2" role="tablist" aria-label="Acesso">
            <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
              Entrar
            </TabButton>
            <TabButton active={mode === 'register'} onClick={() => setMode('register')}>
              Criar conta
            </TabButton>
          </div>
          <p className="font-pixel text-[22px] leading-tight text-secondary">
            {mode === 'login' ? 'Autentique-se pra continuar o treinamento.' : 'Leva menos de um minuto.'}
          </p>

          {mode === 'login' ? (
            <>
              <LoginForm onSuccess={handleAuthSuccess} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/esqueci-senha" className="font-pixel-label text-[9px] text-accent hover:brightness-125">
                  Esqueci minha senha
                </Link>
                <p className="font-pixel-label text-[9px] text-secondary">
                  Primeira vez?{' '}
                  <button type="button" onClick={() => setMode('register')} className="text-accent hover:brightness-125">
                    Criar conta ›
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              {referralCode && (
                <p className="flex items-center gap-2.5 border-2 border-accent bg-accent/[0.08] px-3 py-2.5 font-pixel text-xl leading-tight text-primary">
                  <img src={gemIcon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
                  <span>
                    Você foi indicado! O código <span className="text-accent">{referralCode}</span> entra na sua conta.
                  </span>
                </p>
              )}
              <RegisterForm onSuccess={handleAuthSuccess} referralCode={referralCode} />
              <p className="self-end font-pixel-label text-[9px] text-secondary">
                Já tem conta?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-accent hover:brightness-125">
                  Entrar ›
                </button>
              </p>
            </>
          )}
        </EntryCard>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-2 py-3.5 font-pixel-label text-[11px] leading-none ${active ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'}`}
    >
      {children}
    </button>
  );
}
