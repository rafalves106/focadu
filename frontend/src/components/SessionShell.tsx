import type { ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import quickQuestionOrb from '../assets/reading/quick-question-orb.svg';

/**
 * Chrome compartilhado pelas telas de sessao "estilo Figma" (Leitura, Video, Feedback IA, Projeto
 * Semanal - Fase 7): barra de progresso no topo + orbe decorativo no canto. Cada tela continua
 * dona do proprio cartao central (o conteudo difere demais pra valer a pena compartilhar isso
 * tambem) - so esse invólucro em comum foi extraido.
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
