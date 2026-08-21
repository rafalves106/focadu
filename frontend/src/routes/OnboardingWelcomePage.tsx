import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { OnboardingStepper } from '../components/onboarding/OnboardingStepper';
import { useAuth } from '../contexts/useAuth';

/**
 * `/onboarding` - passo 1/3 (Fase 13b, design Figma "Onboarding — Boas-vindas", node 19-303).
 *
 * Divergências deliberadas do Figma (nenhuma tem dado real por trás, mesmo criterio ja usado em
 * StartDashboard pros cards de Gems/XP/streak):
 * - Nav de topo do mockup (Painel/Cursos/Analytics/Ranking + badge "Indie Dev" + avatar) não
 *   existe no app - essas rotas não existem ainda. Mantido só o wordmark FOCADU, mesmo cabeçalho
 *   minimalista de LoginPage/SplashPage.
 * - Painel decorativo "SEC_PILOT_HUD_V1" (CPU Load/Shielding/barra de instalação) é puro mockup
 *   sem dado nenhum por trás - omitido.
 * - Texto de marketing trocado por uma variação do que já existe em LoginPage ("sem atalho de IA
 *   respondendo por você") em vez do original do Figma, que promete XP/rankings/certificações que
 *   não existem ainda (gamificação real é Fase 14).
 */
export function OnboardingWelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skipping, setSkipping] = useState(false);

  if (!user) return null;
  if (user.profileCompletedAt) return <Navigate to="/selecionar-curso" replace />;

  // "Pular tour" (Figma): pula a Entrevista de Perfil tambem, nao so este passo - sem minimo de
  // interesses exigido (User.CompleteProfile aceita lista vazia), entao concluir com tudo vazio e
  // uma resposta valida, so sem personalizacao futura.
  async function handleSkip() {
    setSkipping(true);
    try {
      await api.completeProfile([], null);
      navigate('/selecionar-curso');
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="border-b border-surface-alt px-8 py-5">
        <p className="text-lg font-black tracking-[0.3em] text-primary">FOCADU</p>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-8">
        <OnboardingStepper step={1} />

        <div>
          <h1 className="text-4xl font-black text-primary">Bem-vindo ao seu cockpit de aprendizado</h1>
          <p className="mt-4 text-base leading-relaxed text-secondary">
            Focadu transforma o estudo de segurança ofensiva e defensiva numa jornada guiada e prática - sessões
            diárias, avaliação real e um currículo estruturado, sem atalho de IA respondendo por você.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="text-sm text-secondary underline-offset-2 hover:text-primary hover:underline disabled:opacity-50"
          >
            Pular tour
          </button>
          <button
            type="button"
            onClick={() => navigate('/onboarding/perfil')}
            className="rounded-xl bg-accent px-6 py-3 text-sm font-bold tracking-wide text-base"
          >
            Próximo Passo →
          </button>
        </div>
      </div>
    </div>
  );
}
