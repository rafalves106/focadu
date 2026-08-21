import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import type { UserDto } from '../api/types';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/useAuth';
import { resolveLandingPath } from '../lib/onboarding';

type Mode = 'login' | 'register';

/**
 * /login (Fase 12, design Figma "Login/Registro", node 19:8 - fidelidade revisada depois da
 * Fase 18) - abas Entrar/Criar Conta na mesma tela.
 *
 * Reproduzido fielmente: brilho radial + tipografia Archivo/Fira Code, hero FOCADU 72px, tabs com
 * barrinha de 32px (nao borda inteira), inputs/botao no tamanho e raio exatos do node.
 *
 * Deliberadamente fora do node (mesma decisao das Fases 12/15/17, so reafirmada aqui):
 * - Rodape "System stable | LATENCY: 14ms" - telemetria fake, sem monitoramento real no backend;
 *   o app nunca renderiza numero que nao vem de um dado de verdade (mesmo criterio da Fase 18).
 * - Botoes GitHub/Google + divisor "ou continue com" - sem OAuth no backend, nao ha pra onde ir.
 * - "Esqueci minha senha" - sem fluxo de recuperacao de senha construido, nao deixado como link
 *   morto.
 * - Grade de fundo "matrix" (digitos 1/0) do painel esquerdo - opacidade 8% no proprio Figma, ja
 *   imperceptivel no screenshot de referencia; cortado (ponytail: custaria ~225 nos de DOM ou um
 *   tile SVG pra um efeito que ninguem nota - o brilho radial sozinho ja carrega a atmosfera).
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
      <div
        className="hidden flex-1 flex-col justify-center gap-8 border-r border-surface-alt bg-base p-20 lg:flex"
        style={{ backgroundImage: 'radial-gradient(560px 560px at 50% 50%, rgba(57,255,106,0.10) 0%, rgba(10,10,10,0) 80%)' }}
      >
        <p className="font-mono text-sm font-semibold tracking-[3px] text-accent uppercase">// Cockpit study initiated</p>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-7xl leading-[1.05] font-extrabold tracking-[-2px] text-primary">FOCADU</h1>
          <p className="font-display text-[28px] leading-normal font-medium tracking-[-0.28px] text-accent">
            Domine cybersecurity jogando.
          </p>
        </div>
        <p className="font-display max-w-[480px] text-base leading-[1.6] text-secondary">
          Estude fundamentos de verdade, com sessões diárias, avaliação real e um currículo guiado - sem atalho de IA
          respondendo por você.
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center p-8 sm:p-16 lg:w-[640px] lg:max-w-[640px] lg:flex-none lg:p-20">
        <div className="flex w-full flex-col gap-12">
          <div className="flex flex-col gap-6">
            <div className="flex gap-8">
              <TabButton active={mode === 'login'} onClick={() => setMode('login')}>
                Entrar
              </TabButton>
              <TabButton active={mode === 'register'} onClick={() => setMode('register')}>
                Criar Conta
              </TabButton>
            </div>

            {mode === 'login' ? (
              <p className="font-display text-[15px] text-secondary">
                Bem-vindo de volta, operador. Autentique-se para continuar o treinamento.
              </p>
            ) : (
              <p className="font-display text-[15px] text-secondary">Leva menos de um minuto.</p>
            )}
          </div>

          {mode === 'login' ? (
            <div className="flex flex-col gap-6">
              <LoginForm onSuccess={handleAuthSuccess} />
              <p className="font-display text-center text-sm text-secondary">
                Primeira vez?{' '}
                <button type="button" onClick={() => setMode('register')} className="font-semibold text-accent hover:underline">
                  Crie sua conta em 30s
                </button>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {referralCode && (
                <p className="font-display rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
                  Você foi indicado! Código <span className="font-mono font-bold">{referralCode}</span> será aplicado ao criar sua conta.
                </p>
              )}
              <RegisterForm onSuccess={handleAuthSuccess} referralCode={referralCode} />
              <p className="font-display text-center text-sm text-secondary">
                Já tem conta?{' '}
                <button type="button" onClick={() => setMode('login')} className="font-semibold text-accent hover:underline">
                  Entrar
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-start gap-2 ${active ? '' : 'opacity-40'}`}>
      <span className={`font-display text-xl font-bold tracking-[1px] uppercase ${active ? 'text-primary' : 'text-secondary'}`}>
        {children}
      </span>
      <span className={`h-[3px] w-8 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
    </button>
  );
}
