import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { SignupStatusDto, UserDto } from '../api/types';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/useAuth';
import { resolveLandingPath } from '../lib/onboarding';
import { EntryCard, EntryPitch, PixelLogo } from '../components/entry/Entry';
import gemIcon from '../assets/pixel/gema.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';
import { PixelButton } from '../components/session/PixelButton';
import { PixelTextField } from '../components/auth/PixelFields';

const INVITE_LENGTH = 8;

type Mode = 'login' | 'register';

/**
 * /login (Fase 12; pixel art na Fase 74, Figma "Entrada e onboarding — v2", nodes 144:4587/144:5226/
 * 146:7373) - abas Entrar/Criar conta na mesma tela. A esquerda (so a partir de `lg`), o que e a Focadu,
 * o agente do kit basico e a Focada; a direita, o cartao com as abas e o formulario. `?ref=` (indicacao)
 * abre direto em "Criar conta" com a faixa verde do codigo.
 *
 * Fase 93 (Figma "Cadastro por convite — v3", pagina 253:4502): com o cadastro fechado (Signup:InviteOnly), a aba
 * "Criar conta" mostra so o aviso, o botao "Tenho convite de tester" e o contato; o formulario aparece quando o
 * codigo chega a 8 caracteres. `?convite=` abre direto com o codigo preenchido. A tela so orienta: quem confere
 * o convite e o POST de cadastro.
 */
export function LoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  // Fase 17: /login?ref=CODIGO (link de indicacao) - pula direto pra aba de registro, ja que
  // quem clicou num link assim quase sempre quer criar conta, nao entrar numa ja existente.
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const inviteParam = searchParams.get('convite');
  const [mode, setMode] = useState<Mode>(referralCode || inviteParam ? 'register' : 'login');
  const [signup, setSignup] = useState<SignupStatusDto | null>(null);
  const [inviteOpen, setInviteOpen] = useState(!!inviteParam);
  const [inviteCode, setInviteCode] = useState((inviteParam ?? '').toUpperCase().slice(0, INVITE_LENGTH));
  const [inviteRejected, setInviteRejected] = useState(false);

  // Sem resposta (rede fora), trata como aberto: o POST de cadastro barra do mesmo jeito se estiver fechado.
  useEffect(() => {
    api
      .getSignupStatus()
      .then(setSignup)
      .catch(() => setSignup({ inviteOnly: false, emailVerification: false, contactEmail: null }));
  }, []);

  // Evita a tela de login "piscar" atras da splash - so mostra o formulario depois que
  // AuthProvider ja sabe se ha sessao ou nao.
  if (isLoading) return null;
  // Sessao ja ativa (ex: voltou pro /login pelo navegador) - manda pra Splash em vez de assumir
  // /start direto, pra passar pela mesma resolveLandingPath (onboarding/selecao de curso podem
  // ainda estar pendentes).
  if (user) return <Navigate to="/" replace />;

  const registerClosed = mode === 'register' && !!signup?.inviteOnly && !inviteOpen;
  const askInvite = !!signup?.inviteOnly || !!inviteParam;
  const inviteComplete = inviteCode.length === INVITE_LENGTH;

  function handleAuthSuccess(authedUser: UserDto) {
    resolveLandingPath(authedUser).then((destination) => navigate(destination));
  }

  return (
    <div className="flex min-h-dvh items-center bg-base px-4 py-8 sm:px-10 lg:px-24">
      <div className="mx-auto flex w-full max-w-[1250px] flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="hidden lg:block">
          <EntryPitch
            expression={mode === 'login' ? 'neutra' : 'comemorando'}
            focada={
              mode === 'login'
                ? 'Voltou, agente? O mapa guardou seu lugar.'
                : registerClosed
                  ? 'O teste é fechado, agente. Com convite, eu abro a porta.'
                  : 'Novo por aqui? Eu sou a Focada. Cria a conta que eu te mostro o caminho.'
            }
          />
        </div>

        {/* Celular: so o logo e o slogan em cima do cartao (Figma 146:7373). */}
        <div className="flex flex-col gap-4 lg:hidden">
          <p className="font-pixel-label text-[8px] text-accent">// Treino de segurança, um dia por vez</p>
          <PixelLogo scale={6} />
          <p className="font-pixel text-[28px] leading-none text-accent">Domine cybersecurity jogando.</p>
        </div>

        <EntryCard className="w-full lg:w-[536px] lg:shrink-0">
          <div data-guia="login-abas" className="grid grid-cols-2" role="tablist" aria-label="Acesso">
            <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
              Entrar
            </TabButton>
            <TabButton active={mode === 'register'} onClick={() => setMode('register')}>
              Criar conta
            </TabButton>
          </div>
          <p className="font-pixel text-[22px] leading-tight text-secondary">
            {mode === 'login'
              ? 'Autentique-se pra continuar o treinamento.'
              : registerClosed
                ? 'Teste fechado: só entra quem tem convite.'
                : 'Leva menos de um minuto.'}
          </p>

          {mode === 'login' ? (
            <>
              <LoginForm onSuccess={handleAuthSuccess} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link data-guia="login-esqueci" to="/esqueci-senha" className="font-pixel-label text-[9px] text-accent hover:brightness-125">
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
          ) : !signup ? null : registerClosed ? (
            <>
              <p className="flex items-center gap-3 border-2 border-stroke px-3 py-2.5 font-pixel text-xl leading-tight text-primary">
                <img src={lockIcon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
                <span>Por enquanto a Focadu só abre a porta pra quem tem convite de tester.</span>
              </p>
              <PixelButton data-guia="login-convite" onClick={() => setInviteOpen(true)} className="w-full">
                Tenho convite de tester
              </PixelButton>
              {signup.contactEmail && (
                <div className="flex flex-col gap-1.5 border-2 border-stroke px-3 py-2.5">
                  <p className="font-pixel-label text-[8px] text-secondary">Quer entrar no teste?</p>
                  <p className="font-pixel text-xl leading-tight text-primary">
                    Fale com o Falves:{' '}
                    <a href={`mailto:${signup.contactEmail}`} className="text-accent hover:brightness-125">
                      {signup.contactEmail}
                    </a>
                  </p>
                </div>
              )}
              <p className="self-end font-pixel-label text-[9px] text-secondary">
                Já tem conta?{' '}
                <button type="button" onClick={() => setMode('login')} className="text-accent hover:brightness-125">
                  Entrar ›
                </button>
              </p>
            </>
          ) : (
            <>
              {askInvite && (
                <div data-guia="login-convite" className="flex flex-col gap-2">
                  <PixelTextField
                    label="Código do convite"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteRejected(false);
                      setInviteCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, INVITE_LENGTH));
                    }}
                    placeholder="ABCD2345"
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus={!inviteParam}
                    aria-invalid={inviteRejected}
                    className={inviteRejected ? '!border-alert' : undefined}
                  />
                  <p className="font-pixel text-lg leading-none text-secondary">
                    {inviteComplete
                      ? inviteParam && inviteCode === inviteParam.toUpperCase()
                        ? 'Veio do link. Se precisar, dá pra trocar.'
                        : 'Código completo. Agora é só criar a conta.'
                      : `Faltam ${INVITE_LENGTH - inviteCode.length} de ${INVITE_LENGTH} caracteres.`}
                  </p>
                </div>
              )}
              {referralCode && (
                <p className="flex items-center gap-2.5 border-2 border-accent bg-accent/[0.08] px-3 py-2.5 font-pixel text-xl leading-tight text-primary">
                  <img src={gemIcon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
                  <span>
                    Você foi indicado! O código <span className="text-accent">{referralCode}</span> entra na sua conta.
                  </span>
                </p>
              )}
              {(!askInvite || inviteComplete) && (
                <RegisterForm
                  onSuccess={handleAuthSuccess}
                  referralCode={referralCode}
                  inviteCode={askInvite ? inviteCode : null}
                  onInviteRejected={() => setInviteRejected(true)}
                />
              )}
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
