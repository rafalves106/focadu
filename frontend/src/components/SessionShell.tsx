import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import quickQuestionOrb from '../assets/reading/quick-question-orb.svg';

/**
 * Chrome compartilhado pelas telas de sessao "estilo Figma" (Leitura, Video, Feedback IA, Projeto
 * Semanal - Fase 7; Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado a partir da Fase 19): barra
 * de progresso no topo + orbe decorativo no canto. Cada tela continua dona do proprio cartao
 * central (o conteudo difere demais pra valer a pena compartilhar isso tambem) - so esse invólucro
 * em comum foi extraido.
 */
export function SessionTopBar({
  eyebrow,
  stepLabel,
  progress,
  tone = 'accent',
}: {
  /** String simples (rotulo) ou um elemento proprio (ex: link "Voltar") - ver WeeklyProjectPage. */
  eyebrow: ReactNode;
  stepLabel: string;
  /** 0 a 1. */
  progress: number;
  tone?: 'accent' | 'project';
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-medium uppercase tracking-[2px] text-muted">{eyebrow}</div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-secondary">{stepLabel}</p>
        <div className="w-[220px]">
          <ProgressBar progress={progress} tone={tone} />
        </div>
      </div>
    </div>
  );
}

export function QuickQuestionOrb() {
  return <img src={quickQuestionOrb} alt="" className="pointer-events-none fixed bottom-10 right-10 size-16" />;
}

/**
 * Layout inteiro de uma tela de sessao (Fase 19) - SessionTopBar + [cartao central | sidebar] +
 * orbe, generalizado a partir do que ReadingActivity/VideoActivity ja faziam desde a Fase 7 (esse
 * JSX estava duplicado nos 2, sem componente proprio). `card=false` (so o Resumo Falado usa) pula
 * o cartao com borda/fundo - o Figma mostra a gravacao de voz flutuando direto sobre o fundo, sem
 * cartao ao redor (unico caso assim entre as 7 telas de sessao).
 */
export function SessionLayout({
  eyebrow,
  stepLabel,
  progress,
  sidebar,
  card = true,
  children,
}: {
  eyebrow: ReactNode;
  stepLabel: string;
  progress: number;
  sidebar?: ReactNode;
  card?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-base p-10">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-8">
        <SessionTopBar eyebrow={eyebrow} stepLabel={stepLabel} progress={progress} />

        <div className="flex items-start gap-8">
          {card ? (
            <div className="flex w-full flex-col gap-5 rounded-[20px] border border-stroke bg-surface px-10 pt-8 pb-7">
              {children}
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-10 py-10 text-center">{children}</div>
          )}
          {sidebar}
        </div>
      </div>

      <QuickQuestionOrb />
    </div>
  );
}
