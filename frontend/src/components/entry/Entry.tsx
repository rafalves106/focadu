import type { ReactNode } from 'react';
import { CosmeticSlot } from '../../api/types';
import type { AgentLook } from '../../lib/agentSprites';
import { AgentSprite } from '../agent/AgentSprite';
import { FocadaSays } from '../session/FocadaSays';
import type { FocadaExpression } from '../../lib/focadaLines';
import logoWordmark from '../../assets/pixel/logo-wordmark.png';
import checkIcon from '../../assets/pixel/check.png';
import terminalIcon from '../../assets/pixel/terminal.png';
import casteloIcon from '../../assets/pixel/mapa/castelo-pendente.png';

/**
 * Pecas das telas fora do app (Fase 74, Figma "Entrada e onboarding — v2", pagina 144:4502): logo em
 * escala inteira, topo do onboarding com "Passo N de 3", chip de escolha, o cartao com sombra verde e a
 * coluna de apresentacao do login.
 */

/** Logo FOCADU (35×7) em escala inteira. */
export function PixelLogo({ scale = 4, className = '' }: { scale?: number; className?: string }) {
  return <img src={logoWordmark} alt="Focadu" className={`w-auto pixelated ${className}`} style={{ height: 7 * scale }} />;
}

const TOTAL_STEPS = 3;

/** "Passo N de 3" + 3 blocos (Figma 145:6207). */
export function OnboardingStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="font-pixel-label text-[10px] text-accent">
        Passo {step} de {TOTAL_STEPS}
      </span>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`h-2.5 w-8 ${i < step ? 'bg-accent' : 'bg-stroke'}`} />
        ))}
      </div>
    </div>
  );
}

/** Topo das telas de onboarding e senha: logo a esquerda e, no onboarding, o passo a direita. */
export function EntryTopBar({ step }: { step?: 1 | 2 | 3 }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b-2 border-stroke px-4 py-4 sm:px-16 sm:py-[22px]">
      <PixelLogo scale={4} />
      {step && <OnboardingStepper step={step} />}
    </header>
  );
}

/** Tela inteira fora do app (sem GlobalNav): fundo base e altura da janela. */
export function EntryScreen({ step, topBar = true, children }: { step?: 1 | 2 | 3; topBar?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-base">
      {topBar && <EntryTopBar step={step} />}
      {children}
    </div>
  );
}

/** Cartao principal das telas de entrada: borda verde e sombra reta. */
export function EntryCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`flex flex-col gap-5 border-2 border-accent/60 bg-base p-5 shadow-[6px_6px_0_0_#1c9e3e] sm:px-8 sm:py-7 ${className}`}>{children}</section>;
}

/** Chip de escolha (interesses, linguagem) - substitui o InterestChip arredondado. */
export function ChoiceChip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`border-2 px-3.5 py-2.5 font-pixel-label text-[10px] leading-none transition-colors ${
        selected ? 'border-accent bg-accent/10 text-accent' : 'border-stroke text-secondary hover:border-secondary hover:text-primary'
      }`}
    >
      {label}
    </button>
  );
}

/** Agente do kit basico (o mesmo que todo aluno ganha na criacao) - so ilustracao da tela de login. */
const KIT_LOOK: AgentLook = {
  skinTone: 3,
  layers: {
    [CosmeticSlot.Bottom]: 'parte-de-baixo/calca',
    [CosmeticSlot.Shoes]: 'tenis/tenis',
    [CosmeticSlot.Top]: 'parte-de-cima/moletom',
    [CosmeticSlot.Hair]: 'cabelo/curto',
  },
};

const PITCH = [
  { icon: checkIcon, text: 'Uma Daily por dia, com avaliação de verdade: você explica em voz alta, sem IA respondendo por você.' },
  { icon: terminalIcon, text: 'Um projeto por semana, no seu próprio repositório git.' },
  { icon: casteloIcon, text: '12 semanas, 12 castelos. Um mapa pra atravessar.' },
];

/** Coluna de apresentacao do login/cadastro (Figma 144:4587): o que e a Focadu, o agente e a Focada. */
export function EntryPitch({ focada, expression }: { focada: string; expression: FocadaExpression }) {
  return (
    <div className="flex flex-col gap-7">
      <p className="font-pixel-label text-[10px] text-accent">// Treino de segurança, um dia por vez</p>
      <PixelLogo scale={9} className="self-start" />
      <p className="font-pixel text-[40px] leading-none text-accent">Domine cybersecurity jogando.</p>
      <ul className="flex max-w-[560px] flex-col gap-3.5">
        {PITCH.map((item) => (
          <li key={item.text} className="flex items-center gap-3.5">
            <img src={item.icon} alt="" className="size-8 shrink-0 pixelated" aria-hidden="true" />
            <span className="font-pixel text-[22px] leading-tight text-secondary">{item.text}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-4">
        <AgentSprite look={KIT_LOOK} scale={4} />
        <FocadaSays expression={expression} size="md" className="max-w-[380px]">
          {focada}
        </FocadaSays>
      </div>
    </div>
  );
}
