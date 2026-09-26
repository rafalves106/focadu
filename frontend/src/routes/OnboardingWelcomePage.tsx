import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { EntryScreen } from '../components/entry/Entry';
import { FocadaSays } from '../components/session/FocadaSays';
import { PixelButton } from '../components/session/PixelButton';
import pontoIcon from '../assets/pixel/mapa/ponto-em-andamento.png';
import casteloIcon from '../assets/pixel/mapa/castelo-pendente.png';
import bandeiraIcon from '../assets/pixel/bandeira.png';
import { useAuth } from '../contexts/useAuth';

/**
 * `/onboarding` - passo 1/3 (Fase 13b; pixel art na Fase 74, Figma "Entrada e onboarding — v2", node
 * 145:6207): a Focada se apresenta e os 3 pilares (Daily, Projeto, Trilha). "Pular tour" completa o
 * perfil vazio e vai direto pra escolha do curso.
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
      await api.completeProfile([], null, []);
      navigate('/selecionar-curso');
    } finally {
      setSkipping(false);
    }
  }

  return (
    <EntryScreen step={1}>
      <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col justify-center gap-8 px-4 py-10">
        <div className="flex flex-col gap-3">
          <p className="font-pixel-label text-[10px] text-accent">// Bem-vindo, agente</p>
          <h1 className="font-pixel text-[40px] leading-none text-primary sm:text-[48px]">Seu cockpit de estudo de segurança</h1>
        </div>

        <FocadaSays size="lg">
          Eu sou a Focada, e vou te acompanhar nas 12 semanas. Aqui ninguém responde por você: você lê, pratica e explica em voz alta. Eu só aponto o caminho (e cobro).
        </FocadaSays>

        <ul className="grid gap-5 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <li key={p.label} className="flex flex-col gap-3 border-2 border-stroke px-5 py-[18px]">
              <img src={p.icon} alt="" className="size-12 pixelated" aria-hidden="true" />
              <span className={`font-pixel-label text-[11px] ${p.tone}`}>{p.label}</span>
              <span className="font-pixel text-[22px] leading-tight text-secondary">{p.text}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3">
          <PixelButton ghost tone="muted" onClick={handleSkip} disabled={skipping}>
            Pular tour
          </PixelButton>
          <PixelButton onClick={() => navigate('/onboarding/perfil')}>Próximo passo ›</PixelButton>
        </div>
      </div>
    </EntryScreen>
  );
}

const PILLARS = [
  { icon: pontoIcon, label: 'Daily', tone: 'text-accent', text: 'Uma sessão por dia: leitura, exercícios e um resumo falado avaliado.' },
  { icon: casteloIcon, label: 'Projeto', tone: 'text-project', text: 'No fim da semana, um projeto de verdade no seu repositório git.' },
  { icon: bandeiraIcon, label: 'Trilha', tone: 'text-accent', text: '12 semanas no mapa. Cada castelo derrubado abre a próxima.' },
];
