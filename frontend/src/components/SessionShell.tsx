import { useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ActivityStatus, ActivityType } from '../api/types';
import { SessionFooterContext, useSession } from '../lib/sessionContext';
import { stepInfo } from '../lib/sessionSteps';
import { setStudyAssistantContext } from '../lib/studyAssistantContext';
import { formatPomodoroTime, usePomodoroTimer } from '../lib/pomodoroTimer';
import { useIsDesktop } from '../lib/useIsDesktop';
import { StudyAssistantPanel } from './assistant/StudyAssistantPanel';
import { MaterialSidebar } from './MaterialSidebar';
import { PixelConfirmDialog } from './PixelConfirmDialog';
import { QuickNotePanel } from './notebook/QuickNotePanel';
import { PomodoroWidget } from './pomodoro/PomodoroWidget';
import { ScrollArea } from './ScrollArea';
import { ErrorGauge } from './session/ErrorGauge';
import { StageChain } from './session/StageChain';
import backArrow from '../assets/pixel/voltar.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';

const TONE_BORDER = { accent: 'border-accent', alert: 'border-alert', project: 'border-project' } as const;
const TONE_TEXT = { accent: 'text-accent', alert: 'text-alert', project: 'text-project' } as const;

/**
 * Manda o conteudo pro rodape fixo do cartao central (fora da area que rola) - botoes de acao e a
 * reacao da Focada. Funciona de qualquer profundidade dentro do `SessionLayout` (portal).
 */
export function SessionFooter({ children }: { children: ReactNode }) {
  const el = useContext(SessionFooterContext);
  return el ? createPortal(children, el) : null;
}

/**
 * Casca da sessao diaria (Fase 68, Figma "Daily — redesign proposto", node 61:4877) - a mesma pra
 * todas as etapas, avisos e a conclusao. Monta sozinha, a partir do `SessionContext` (TodayPage):
 *
 * - topo: voltar pro mapa, "DIA N · titulo", semana, e o conta-giros de erros (saiu do menu global);
 * - 3 colunas a partir de `lg`: material + pomodoro | etapa | anotacao + duvida;
 * - cartao central: rotulo da etapa + cadeia de blocos, conteudo que ROLA POR DENTRO (`ScrollArea`) e
 *   rodape fixo (`footer` ou `<SessionFooter>`).
 *
 * Sem rolagem externa a partir de `lg`: a raiz ocupa o `<main>` da casca global (Fase 67,
 * `lg:flex-1 lg:min-h-0 lg:overflow-hidden`) e cada coluna rola por dentro se a janela for baixa.
 * Abaixo de `lg`: 1 coluna com rolagem normal da pagina, e material/notas/duvida/pomodoro numa gaveta
 * fixa no rodape (`MobileDrawer`).
 */
export function SessionLayout({
  children,
  footer,
  label,
  sub,
  chain,
  tone = 'accent',
  showGauge = true,
  assistantContext,
  notesLocked = false,
  hideBack = false,
  centered = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Rotulo do cartao - padrao "ETAPA N DE M — TIPO" da atividade em tela. */
  label?: string;
  /** Contador fino a direita ("QUESTÃO 2 DE 6") - padrao vem da etapa. */
  sub?: string;
  /** Cadeia de etapas: da atividade em tela, toda concluida, ou nenhuma (avisos). */
  chain?: 'step' | 'done' | 'none';
  tone?: keyof typeof TONE_BORDER;
  showGauge?: boolean;
  /** Contexto do Suporte Rapido de IA (Fase 32) - Leitura/Video passam o texto do material. */
  assistantContext?: string;
  /** Resumo Falado gravando: anotacoes travadas (vale o que o aluno lembra). */
  notesLocked?: boolean;
  /** Esconde "Etapa anterior" (gravando: trocar de etapa abandonaria o microfone no meio). */
  hideBack?: boolean;
  /** Conteudo centralizado na vertical (apresentacao de bloco, avisos). */
  centered?: boolean;
}) {
  const { daily, weekly, activityId, onBack, goToActivity } = useSession();
  const isDesktop = useIsDesktop();
  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  const [jumpTarget, setJumpTarget] = useState<{ activityId: string; message: string } | null>(null);

  const info = activityId ? stepInfo(daily, activityId) : null;
  const chainMode = chain ?? (info ? 'step' : 'none');
  const dayTitle = weekly?.dailies.find((d) => d.id === daily.id)?.title ?? null;
  const title = daily.isReinforcement ? `Reforço · Dia ${daily.dayNumber}` : `Dia ${daily.dayNumber}${dayTitle ? ` · ${dayTitle}` : ''}`;
  const headerLabel = label ?? info?.label ?? '';
  const headerSub = sub ?? info?.sub ?? '';

  useEffect(() => {
    setStudyAssistantContext(assistantContext ?? [title, headerLabel].filter(Boolean).join(' — '));
    return () => setStudyAssistantContext(null);
  }, [assistantContext, title, headerLabel]);

  // Material do dia = so o conteudo referenciado pelas atividades DESTA Daily (a Weekly traz os 5 dias).
  const current = activityId ? daily.activities.find((a) => a.id === activityId) : undefined;
  const activeContentId =
    current && (current.type === ActivityType.Reading || current.type === ActivityType.Video) ? current.contentId : null;
  const todaysContentIds = new Set(daily.activities.filter((a) => a.contentId).map((a) => a.contentId!));
  const completedContentIds = new Set(
    daily.activities.filter((a) => a.status === ActivityStatus.Completed && a.contentId).map((a) => a.contentId!),
  );

  // Clique no material (pedido do dono, Fase 68): em vez de abrir a previa num modal, a Focada pergunta
  // se o aluno quer voltar pra etapa daquele conteudo - e dali ele segue etapa por etapa ate onde
  // estava (TodayPage.handleContinue). Desligado gravando (abandonaria o microfone) e fora de sessao.
  // Reforco nao tem etapa de Leitura/Video (so as que o aluno errou): la o material e so informativo.
  const canJump = !!goToActivity && !hideBack && !daily.isReinforcement;
  function handleSelectContent(contentId: string) {
    const target = daily.activities.find(
      (a) => a.contentId === contentId && (a.type === ActivityType.Reading || a.type === ActivityType.Video),
    );
    // So pra tras: ir pra um conteudo que ainda nao chegou pularia etapas.
    if (!target || target.id === activityId || target.status !== ActivityStatus.Completed) return;
    const content = weekly?.curatedContents.find((c) => c.id === contentId);
    const kind = target.type === ActivityType.Reading ? 'pra leitura' : 'pro vídeo';
    setJumpTarget({
      activityId: target.id,
      message: `Quer voltar ${kind}${content ? ` "${content.title}"` : ''}? Depois é só seguir etapa por etapa até onde você parou.`,
    });
  }

  // Reforco so clona as etapas erradas (sem Leitura/Video): sem material, sem cartao vazio.
  const material = weekly && todaysContentIds.size > 0 && (
    <MaterialSidebar
      contents={weekly.curatedContents.filter((c) => todaysContentIds.has(c.id))}
      activeContentId={activeContentId}
      completedContentIds={completedContentIds}
      onSelect={canJump ? handleSelectContent : undefined}
    />
  );
  const notes = weekly && (
    <div className="relative shrink-0">
      <div className={notesLocked ? 'pointer-events-none opacity-30' : ''} aria-hidden={notesLocked}>
        <QuickNotePanel target={{ dailyId: daily.id }} courseId={weekly.courseId} fill className="h-60 lg:tight:h-56" />
      </div>
      {notesLocked && (
        <div className="absolute inset-x-4 top-12 flex items-center gap-2 border-2 border-stroke bg-base px-3 py-2">
          <img src={lockIcon} alt="" className="size-4 pixelated" />
          <span className="font-pixel-label text-[8px] text-secondary">Travadas durante a gravação</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 bg-base px-4 pt-5 pb-20 lg:min-h-0 lg:flex-1 lg:gap-6 lg:overflow-hidden lg:px-8 lg:pt-[45px] lg:pb-12 xl:px-16 lg:[@media(max-height:820px)]:gap-4 lg:[@media(max-height:820px)]:py-6">
      <header className="flex items-end justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-1.5">
          {weekly && (
            <Link
              to={`/start?course=${weekly.courseId}`}
              className="flex w-fit items-center gap-2 font-pixel-label text-[9px] text-secondary hover:text-accent"
            >
              <img src={backArrow} alt="" className="size-4 pixelated" />
              Voltar pro mapa
            </Link>
          )}
          <h1 className="truncate font-pixel text-3xl leading-none text-primary uppercase lg:text-4xl" title={title}>
            {title}
          </h1>
          {weekly && (
            <p className="truncate font-pixel-label text-[8px] text-muted lg:text-[9px]">
              Semana {weekly.number} — {weekly.theme ?? weekly.title}
            </p>
          )}
        </div>
        {showGauge && (
          <ErrorGauge penaltyPoints={daily.penaltyPoints} penaltyThreshold={daily.penaltyThreshold} compact={!isDesktop} />
        )}
      </header>

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-5 xl:gap-8 xl:short:gap-6">
        {isDesktop && (
          <aside className="flex w-52 shrink-0 lg:min-h-0 xl:w-64">
            <ScrollArea className="min-h-0 min-w-0 flex-1" contentClassName="flex min-h-full min-w-0 flex-col gap-6 lg:short:gap-4">
              {material}
              <PomodoroWidget className="min-h-[260px] flex-1 lg:short:min-h-0" />
            </ScrollArea>
          </aside>
        )}

        <section
          className={`flex min-w-0 flex-col gap-4 border-2 bg-base px-4 py-4 lg:min-h-0 lg:flex-1 lg:px-7 lg:py-5 ${TONE_BORDER[tone]}`}
        >
          <div className="flex flex-col gap-3 lg:shrink-0">
            <div className="flex items-center justify-between gap-3">
              <p className={`font-pixel-label text-[9px] ${TONE_TEXT[tone]}`}>// {headerLabel}</p>
              <div className="flex shrink-0 items-center gap-4">
                {onBack && !hideBack && (
                  <button type="button" onClick={onBack} className="font-pixel-label text-[9px] text-secondary hover:text-primary">
                    ← Etapa anterior
                  </button>
                )}
                {headerSub && <p className="font-pixel-label text-[9px] text-secondary">{headerSub}</p>}
              </div>
            </div>
            {chainMode !== 'none' && <StageChain daily={daily} activityId={activityId} allDone={chainMode === 'done'} />}
          </div>
          <span className="h-0.5 shrink-0 bg-surface-alt" aria-hidden="true" />

          <SessionFooterContext.Provider value={footerEl}>
            <ScrollArea
              className="lg:min-h-0 lg:flex-1"
              contentClassName={`flex flex-col gap-4 lg:pr-5 ${centered ? 'min-h-full justify-center' : ''}`}
            >
              {children}
            </ScrollArea>
          </SessionFooterContext.Provider>

          <div ref={setFooterEl} className="flex flex-wrap items-end gap-3 empty:hidden lg:shrink-0 [&>*:last-child]:ml-auto">
            {footer}
          </div>
        </section>

        {isDesktop && (
          <aside className="flex w-52 shrink-0 lg:min-h-0 xl:w-64">
            <ScrollArea className="min-h-0 min-w-0 flex-1" contentClassName="flex min-h-full min-w-0 flex-col gap-6 lg:short:gap-4">
              {notes}
              <StudyAssistantPanel tall className="min-h-[280px] flex-1 lg:short:min-h-[180px]" />
            </ScrollArea>
          </aside>
        )}
      </div>

      {!isDesktop && weekly && (
        <MobileDrawer
          panels={{
            material,
            notas: notes,
            duvida: <StudyAssistantPanel tall className="h-[60dvh]" />,
            pomodoro: <PomodoroWidget />,
          }}
        />
      )}

      <PixelConfirmDialog
        open={jumpTarget !== null}
        message={jumpTarget?.message ?? ''}
        confirmLabel="Voltar pro material"
        cancelLabel="Ficar aqui"
        onConfirm={() => {
          if (jumpTarget && goToActivity) goToActivity(jumpTarget.activityId);
          setJumpTarget(null);
        }}
        onCancel={() => setJumpTarget(null)}
      />
    </div>
  );
}

type DrawerTab = 'material' | 'notas' | 'duvida' | 'pomodoro';

/** Celular (abaixo de `lg`): as colunas laterais viram uma gaveta presa ao rodape da tela. */
function MobileDrawer({ panels }: { panels: Record<DrawerTab, ReactNode> }) {
  const [open, setOpen] = useState<DrawerTab | null>(null);
  const timer = usePomodoroTimer();
  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'material', label: 'Material' },
    { id: 'notas', label: 'Notas' },
    { id: 'duvida', label: 'Dúvida' },
    { id: 'pomodoro', label: timer.started ? formatPomodoroTime(timer.remainingSeconds) : 'Pomodoro' },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-x-0 bottom-12 z-40 max-h-[75dvh] overflow-y-auto border-t-2 border-secondary bg-base p-4">
          {panels[open]}
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-12 items-stretch border-t-2 border-stroke bg-surface" aria-label="Ferramentas da sessão">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setOpen((prev) => (prev === tab.id ? null : tab.id))}
            aria-expanded={open === tab.id}
            className={`flex-1 font-pixel-label text-[9px] ${
              open === tab.id ? 'bg-surface-alt text-accent' : tab.id === 'pomodoro' && timer.isRunning ? 'text-accent' : 'text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );
}
