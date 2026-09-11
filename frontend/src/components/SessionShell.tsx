import { useEffect, type ReactNode } from 'react';
import { ProgressBar } from './ProgressBar';
import { StudyAssistantWidget } from './StudyAssistantWidget';
import { setStudyAssistantContext } from '../lib/studyAssistantContext';

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
  // Fase 32: reativado - implementa o "Suporte Rápido de IA" que secret/rascunhos/visual-ui-ux.md
  // ja previa (botao flutuante + chat curto/direto). Continua sendo o unico ponto de renderizacao
  // (StudyAssistantWidget em arquivo proprio, componente com estado real demais pra caber aqui
  // junto de SessionTopBar/SessionLayout) - os 2 call sites (SessionLayout abaixo e
  // WeeklyProjectPage) continuam sem precisar mudar.
  return <StudyAssistantWidget />;
}

/**
 * Layout inteiro de uma tela de sessao (Fase 19) - SessionTopBar + [cartao central | sidebar] +
 * orbe, generalizado a partir do que ReadingActivity/VideoActivity ja faziam desde a Fase 7 (esse
 * JSX estava duplicado nos 2, sem componente proprio). `card=false` (so o Resumo Falado usa) pula
 * o cartao com borda/fundo - o Figma mostra a gravacao de voz flutuando direto sobre o fundo, sem
 * cartao ao redor (unico caso assim entre as 7 telas de sessao).
 *
 * `pt-20` (Fase 20, era `p-10` simetrico): da folga pro `PenaltyGauge` (TodayPage), `fixed left-6`
 * por cima de QUALQUER tela de sessao. Nasceu quando `/hoje` ficou full-bleed sem nenhum nav acima
 * (Fase 20) - o `GlobalNav` voltou a aparecer em `/hoje` na Fase 25 (empurra o conteudo ~56px via
 * fluxo normal, fora deste `pt-20`), mas o `PenaltyGauge` continua `fixed` (ignora fluxo) - o
 * `pt-20` segue garantindo folga entre ele e o `SessionTopBar`, so que com margem mais folgada
 * agora (o header em fluxo ja empurra tudo sozinho, isso aqui e so o extra pro badge fixo).
 *
 * `assistantContext` (Fase 32, opcional): alimenta o Suporte Rapido de IA com "o que esta na tela
 * agora" - so Reading/VideoActivity passam algo mais rico (titulo + trecho do conteudo); as outras
 * 5 atividades (Quiz/Ligar Palavras/Cloze/Roleplay/Resumo Falado) nao precisam - o proprio enunciado
 * ja fica visivel em tela, o aluno consegue colar/reescrever a duvida no chat. Sem essa prop, cai no
 * fallback `eyebrow + stepLabel` (tema da semana + qual etapa) - nunca fica sem contexto nenhum.
 */
export function SessionLayout({
  eyebrow,
  stepLabel,
  progress,
  sidebar,
  card = true,
  assistantContext,
  children,
}: {
  eyebrow: ReactNode;
  stepLabel: string;
  progress: number;
  sidebar?: ReactNode;
  card?: boolean;
  assistantContext?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const fallback = typeof eyebrow === 'string' ? [eyebrow, stepLabel].filter(Boolean).join(' — ') : stepLabel;
    setStudyAssistantContext(assistantContext ?? fallback);
    return () => setStudyAssistantContext(null);
  }, [assistantContext, eyebrow, stepLabel]);

  return (
    <div className="min-h-screen bg-base px-10 pt-20 pb-10">
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
