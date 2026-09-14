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
  onBack,
}: {
  /** String simples (rotulo) ou um elemento proprio (ex: link "Voltar") - ver WeeklyProjectPage. */
  eyebrow: ReactNode;
  stepLabel: string;
  /** 0 a 1. */
  progress: number;
  tone?: 'accent' | 'project';
  /** Fase 36: quando presente, mostra "Etapa anterior" acima do stepLabel - volta pra atividade
   * anterior da MESMA Daily pra revisar (nunca refaz: cada componente de atividade ja decide seu
   * proprio estado "ja respondida" via `activity.responses`, ver TodayPage). Omitido na 1a
   * atividade (nao ha pra onde voltar) ou quando o proprio chamador julgar inseguro interromper
   * (ex: VoiceSummaryActivity gravando). */
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs font-medium uppercase tracking-[2px] text-muted">{eyebrow}</div>
      <div className="flex flex-col items-end gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-[11px] font-medium uppercase tracking-[1px] text-muted hover:text-primary"
          >
            &larr; Etapa anterior
          </button>
        )}
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
  // ja previa (botao flutuante + chat curto/direto). Fase 37: `SessionLayout` parou de renderizar
  // isso sozinho - nas telas com "material de hoje" o botao flutuante deu lugar ao card fixo
  // `StudyAssistantPanel` no sidebar (ver useMaterialSidebar.tsx). Unico call site restante e
  // WeeklyProjectPage, que nao tem esse sidebar.
  return <StudyAssistantWidget />;
}

/**
 * Layout inteiro de uma tela de sessao (Fase 19) - SessionTopBar + [leftSidebar | cartao central |
 * sidebar] + orbe, generalizado a partir do que ReadingActivity/VideoActivity ja faziam desde a
 * Fase 7 (esse JSX estava duplicado nos 2, sem componente proprio). `card=false` (so o Resumo
 * Falado usa) pula o cartao com borda/fundo - o Figma mostra a gravacao de voz flutuando direto
 * sobre o fundo, sem cartao ao redor (unico caso assim entre as 7 telas de sessao).
 *
 * `leftSidebar`/`sidebar` (pedidos explicitos, Fase 37): coluna esquerda tem "Material de hoje" +
 * Pomodoro; coluna direita tem Caderninho de Anotacoes + `StudyAssistantPanel` (Suporte Rapido de
 * IA em card fixo, ver useMaterialSidebar.tsx pra como cada coluna e montada). `items-stretch` (em
 * vez de `items-start`) faz as 2 colunas terem a mesma altura do cartao central - cada coluna usa
 * `justify-between` internamente pra grudar o 1o item no topo e o 2o embaixo, sem nenhum dos cards
 * esticar sozinho.
 *
 * `pt-8` (Fase 20-36: era `p-10` simetrico, depois `pt-20` pra dar folga pro antigo `PenaltyGauge`
 * fixo por cima de QUALQUER tela de sessao nao colidir com `SessionTopBar`, quando `/hoje` ficou
 * full-bleed sem nenhum nav acima). O `GlobalNav` voltou a aparecer em `/hoje` na Fase 25 (empurra
 * o conteudo ~56px via fluxo normal, fora deste `pt-8`) e o contador de erros saiu de `fixed` de
 * vez na Fase 36 (virou badge no proprio `GlobalNav`, ver `PenaltyHeaderBadge`) - `pt-20` ficou
 * espaco vazio sem função, reportado numa verificação ao vivo como gap grande demais entre o
 * header e o `eyebrow`/titulo da sessao. Reduzido pra `pt-8`, so a folga normal de respiro.
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
  leftSidebar,
  sidebar,
  card = true,
  assistantContext,
  onBack,
  children,
}: {
  eyebrow: ReactNode;
  stepLabel: string;
  progress: number;
  /** "Material de hoje" - unico bloco do lado esquerdo do cartao central, ver doc acima. */
  leftSidebar?: ReactNode;
  sidebar?: ReactNode;
  card?: boolean;
  assistantContext?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const fallback = typeof eyebrow === 'string' ? [eyebrow, stepLabel].filter(Boolean).join(' — ') : stepLabel;
    setStudyAssistantContext(assistantContext ?? fallback);
    return () => setStudyAssistantContext(null);
  }, [assistantContext, eyebrow, stepLabel]);

  return (
    // Espacamento apertado a pedido (Fase 36) - era px-10 pt-8 pb-10/gap-8/pt-8 pb-7, sobrava
    // scroll vertical demais em janelas mais baixas mesmo depois do pt-20->pt-8 anterior.
    //
    // px-10->px-6 e max-w-[1360px]->max-w-[1600px] (pedido explicito, mesma sessao que trouxe o
    // `leftSidebar`): com os DOIS sidebars de 280px fixos ladeando o cartao central, o orcamento de
    // largura antes reservado a 1 sidebar (280px + 1 gap-8) passou a sustentar 2 (560px + 2 gap-8) -
    // sem folga extra o cartao central ficava visivelmente espremido. Padding lateral da pagina
    // menor + teto mais largo devolvem espaco ao centro sem depender de tela ultra-wide (o container
    // continua limitado pela viewport onde ela for menor que o max-w).
    <div className="min-h-screen bg-base px-6 pt-5 pb-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
        <SessionTopBar eyebrow={eyebrow} stepLabel={stepLabel} progress={progress} onBack={onBack} />

        <div className="flex items-stretch gap-8">
          {leftSidebar}
          {card ? (
            <div className="flex w-full flex-col gap-5 rounded-[20px] border border-stroke bg-surface px-10 pt-6 pb-6">
              {children}
            </div>
          ) : (
            <div className="flex w-full flex-col items-center gap-10 py-10 text-center">{children}</div>
          )}
          {sidebar}
        </div>
      </div>
    </div>
  );
}
