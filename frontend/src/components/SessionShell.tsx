import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ActivityStatus, ActivityType, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { SessionFooterContext, useSession } from '../lib/sessionContext';
import { ACTIVITY_TITLE, sessionStages, sortedActivities, stepInfo, type StepInfo } from '../lib/sessionSteps';
import { setStudyAssistantCodeBridge, setStudyAssistantContext, setStudyAssistantCourse } from '../lib/studyAssistantContext';
import { formatPomodoroTime, usePomodoroTimer } from '../lib/pomodoroTimer';
import { pauseSessionKeys } from '../lib/useSessionKeys';
import { useGuide } from '../contexts/useGuide';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { useMissionProgress } from '../lab/terminalMissionStore';
import { StudyAssistantPanel } from './assistant/StudyAssistantPanel';
import { MaterialSidebar } from './MaterialSidebar';
import { QuickNotePanel } from './notebook/QuickNotePanel';
import { PomodoroWidget } from './pomodoro/PomodoroWidget';
import { ScrollArea } from './ScrollArea';
import { BlockOpening } from './session/BlockOpening';
import { DayGauge } from './session/DayGauge';
import { StageBar } from './session/StageBar';
import { Breadcrumb } from './ui/Breadcrumb';
import { Button } from './ui/Button';
import { FocadaLine } from './ui/FocadaLine';
import { Modal } from './ui/Modal';
import capeloIcon from '../assets/pixel/capelo.png';
import terminalIcon from '../assets/pixel/terminal.png';
import ajudaIcon from '../assets/pixel/ajuda.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';

/** Tom do cartão de conteúdo: o projeto e a ponte pro projeto são âmbar (sistema.md regra 6). */
const TONE_CARD = { accent: 'border-stroke bg-surface', alert: 'border-stroke bg-surface', project: 'border-project bg-project-tint' } as const;

/** Blocos que a Focada apresenta (os que tinham a tela "Bora" antes da Fase 109). */
const OPENING_TYPES = new Set<ActivityType>([ActivityType.Quiz, ActivityType.Cloze, ActivityType.WordMatch, ActivityType.Roleplay, ActivityType.CodeStep, ActivityType.TerminalMission]);

type Tool = 'material' | 'pomodoro' | 'notas' | 'duvida';

const TOOL_TITLE: Record<Tool, string> = { material: 'Material', pomodoro: 'Pomodoro', notas: 'Notas', duvida: 'Dúvida' };

/**
 * Manda o conteudo pro rodape do cartao (fora da area que rola por dentro, se rolar) - o Primário e o que
 * vem depois dele. Funciona de qualquer profundidade dentro do `SessionLayout` (portal). O rodape mostra
 * os filhos na ordem inversa: o Primário (sempre o ultimo filho) fica no inicio, alinhado à esquerda.
 */
export function SessionFooter({ children }: { children: ReactNode }) {
  const el = useContext(SessionFooterContext);
  return el ? createPortal(children, el) : null;
}

/** "3 perguntas", "Leitura" - o que tem nesta etapa (sistema.md §6: o `Pequeno 16` apagado ao lado do título). */
function stageMeta(daily: DailyStateDto, info: StepInfo): string {
  const n = info.stage.activities.length;
  const type = info.stage.type;
  const plural = (one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (type === ActivityType.Quiz) return `Quiz · ${plural('pergunta', 'perguntas')}`;
  if (type === ActivityType.Cloze) return `Lacunas · ${plural('frase', 'frases')}`;
  if (type === ActivityType.WordMatch) return `Ligar palavras${n > 1 ? ` · ${plural('grupo', 'grupos')}` : ''}`;
  if (type === ActivityType.CodeStep) {
    const steps = daily.activities.filter((a) => a.type === ActivityType.CodeStep).length;
    return `Code comigo · ${steps} ${steps === 1 ? 'passo' : 'passos'}`;
  }
  return ACTIVITY_TITLE[type];
}

/**
 * Casca da sessão do dia - redesign v1 (Fase 109 etapa 4; molde Foco do docs/design/sistema.md §5, Figma
 * `17:753`, `17:904`, `17:1282` e celular `17:1697`). A mesma para todas as etapas, avisos e o fim:
 *
 * - coluna de foco de 720 centrada: fio `Curso · Semana · Dia · Etapa k de n` com "Erros do dia" à direita
 *   (só depois do 1º erro), título do Dia + o que tem na etapa, barra de etapas, cartão de conteúdo com o
 *   Primário no fim, alinhado à esquerda;
 * - trilhos de 64 nas margens em todo tamanho a partir de md (Material e Pomodoro à esquerda, Notas e
 *   Dúvida à direita), cada um abre uma gaveta por cima; nada de painel fixo aberto, Pomodoro só quando o
 *   aluno pede;
 * - celular: topo próprio ("← Início" e "Dia 3 · Etapa 7 de 11", a nav global some no `/hoje`), segmentos
 *   no lugar dos nós, Primário em largura cheia e a barra de ferramentas embaixo com os mesmos quatro itens.
 *
 * A página não rola: a casca tem a altura exata da tela e, se o conteúdo não couber, só o miolo do
 * cartão rola por dentro (último recurso).
 */
export function SessionLayout({
  children,
  footer,
  label,
  heading,
  sub,
  opening,
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
  /** Último segmento do fio fora de uma etapa ("Aquecimento", "Fim"). Padrão: "Etapa k de n". */
  label?: string;
  /** Título e meta no lugar do título do Dia (fim de sessão: "Dia 3 fechado" · "9 de 11 etapas certas"). */
  heading?: { title: string; meta?: string };
  /** Rótulo pequeno no topo do cartão ("Pergunta 2 de 6"). Padrão vem da etapa. */
  sub?: string;
  /** Abertura de bloco embutida no topo da 1ª pergunta, acima do `sub`. Padrão: a do bloco, na 1ª
   * atividade dele enquanto não tiver resposta; `null` desliga (a tela já tem outra fala). */
  opening?: ReactNode;
  /** Barra de etapas: da atividade em tela, toda concluída, ou nenhuma (avisos). */
  chain?: 'step' | 'done' | 'none';
  tone?: keyof typeof TONE_CARD;
  showGauge?: boolean;
  /** Contexto do Suporte Rapido de IA (Fase 32) - Leitura/Video passam o texto do material. */
  assistantContext?: string;
  /** Conversa por voz gravando: anotacoes travadas (vale o que o aluno lembra). */
  notesLocked?: boolean;
  /** Esconde "Etapa anterior" (gravando: trocar de etapa abandonaria o microfone no meio). */
  hideBack?: boolean;
  /** Conteudo centralizado na vertical (avisos). */
  centered?: boolean;
}) {
  const { daily, weekly, courseName, activityId, onBack, goToActivity } = useSession();

  // Guia das telas (Fase 75): a etapa em tela troca o 1o item da ajuda.
  const { setSessionDetail } = useGuide();
  const activityType = daily.activities.find((a) => a.id === activityId)?.type ?? null;
  useEffect(() => {
    setSessionDetail({ activityType, isReinforcement: daily.isReinforcement, isBridge: !daily.isReinforcement && daily.dayNumber % 6 === 0 });
    return () => setSessionDetail(null);
  }, [setSessionDetail, activityType, daily.isReinforcement, daily.dayNumber]);

  const [footerEl, setFooterEl] = useState<HTMLDivElement | null>(null);
  const [jumpTarget, setJumpTarget] = useState<{ activityId: string; message: string } | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const toolRef = useRef(tool);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  const [notesDraft, setNotesDraft] = useState(false);
  const [unreadReply, setUnreadReply] = useState(false);
  const closeTool = useCallback(() => setTool(null), []);
  const onReply = useCallback(() => {
    if (toolRef.current !== 'duvida') setUnreadReply(true);
  }, []);
  const toggleTool = (t: Tool) => {
    if (t === 'duvida') setUnreadReply(false);
    setTool((cur) => (cur === t ? null : t));
  };
  const pomodoro = usePomodoroTimer();

  const info = activityId ? stepInfo(daily, activityId) : null;
  const chainMode = chain ?? (info ? 'step' : 'none');
  const stageCount = sessionStages(daily).length;
  const stepCrumb = info ? `Etapa ${info.stageIndex + 1} de ${stageCount}` : null;
  const dayTitle = weekly?.dailies.find((d) => d.id === daily.id)?.title ?? null;
  const dayCrumb = daily.isReinforcement ? `Reforço do Dia ${daily.dayNumber}` : `Dia ${daily.dayNumber}`;
  const title = heading?.title ?? (daily.isReinforcement ? `Reforço do Dia ${daily.dayNumber}` : (dayTitle ?? `Dia ${daily.dayNumber}`));
  const meta = heading ? (heading.meta ?? null) : info ? stageMeta(daily, info) : null;
  const eyebrow = sub ?? info?.sub ?? '';
  const lastCrumb = label ?? stepCrumb;
  const mobileCaption = info ? [info.stage.type === ActivityType.CodeStep ? 'Code comigo' : ACTIVITY_TITLE[info.stage.type], eyebrow].filter(Boolean).join(' · ') : eyebrow;

  useEffect(() => {
    setStudyAssistantContext(assistantContext ?? [title, stepCrumb, meta].filter(Boolean).join(' — '));
    return () => setStudyAssistantContext(null);
  }, [assistantContext, title, stepCrumb, meta]);

  // Fase 85: o chat cita o curso da sessao.
  const courseId = weekly?.courseId ?? null;
  useEffect(() => {
    setStudyAssistantCourse(courseId);
    return () => setStudyAssistantCourse(null);
  }, [courseId]);

  // Fase 79: na ponte o chat rapido responde sem analogia e sem entregar o passo.
  const onBridge = !daily.isReinforcement && daily.dayNumber % 6 === 0;
  useEffect(() => {
    setStudyAssistantCodeBridge(onBridge);
    return () => setStudyAssistantCodeBridge(false);
  }, [onBridge]);

  // Material do dia = so o conteudo referenciado pelas atividades DESTA Daily (a Weekly traz os 5 dias).
  const current = activityId ? daily.activities.find((a) => a.id === activityId) : undefined;
  const activeContentId =
    current && (current.type === ActivityType.Reading || current.type === ActivityType.Video) ? current.contentId : null;
  const todaysContentIds = new Set(daily.activities.filter((a) => a.contentId).map((a) => a.contentId!));
  const completedContentIds = new Set(
    daily.activities.filter((a) => a.status === ActivityStatus.Completed && a.contentId).map((a) => a.contentId!),
  );

  // Clique no material (Fase 68): a Focada pergunta se o aluno quer voltar pra etapa daquele conteudo - e
  // dali ele segue etapa por etapa ate onde estava. Desligado gravando e no reforco (so as etapas erradas).
  const canJump = !!goToActivity && !hideBack && !daily.isReinforcement;
  function handleSelectContent(contentId: string) {
    const target = daily.activities.find(
      (a) => a.contentId === contentId && (a.type === ActivityType.Reading || a.type === ActivityType.Video),
    );
    // So pra tras: ir pra um conteudo que ainda nao chegou pularia etapas.
    if (!target || target.id === activityId || target.status !== ActivityStatus.Completed) return;
    const content = weekly?.curatedContents.find((c) => c.id === contentId);
    const kind = target.type === ActivityType.Reading ? 'pra leitura' : 'pro vídeo';
    setTool(null);
    setJumpTarget({
      activityId: target.id,
      message: `Quer voltar ${kind}${content ? ` "${content.title}"` : ''}? Depois é só seguir etapa por etapa até onde você parou.`,
    });
  }

  const hasMaterial = !!weekly && todaysContentIds.size > 0;
  const panels: Record<Tool, ReactNode> = {
    material: hasMaterial && weekly && (
      <MaterialSidebar
        contents={weekly.curatedContents.filter((c) => todaysContentIds.has(c.id))}
        activeContentId={activeContentId}
        completedContentIds={completedContentIds}
        onSelect={canJump ? handleSelectContent : undefined}
      />
    ),
    pomodoro: <PomodoroWidget />,
    notas: weekly && (
      <div className="relative">
        <div className={notesLocked ? 'pointer-events-none opacity-30' : ''} aria-hidden={notesLocked}>
          <QuickNotePanel target={{ dailyId: daily.id }} courseId={weekly.courseId} className="h-72" onDraft={setNotesDraft} />
        </div>
        {notesLocked && (
          <div className="absolute inset-x-4 top-12 flex items-center gap-2 border-2 border-stroke bg-base px-3 py-2">
            <img src={lockIcon} alt="" className="size-4 pixelated" />
            <span className="text-rotulo-sm text-secondary">Travadas durante a gravação</span>
          </div>
        )}
      </div>
    ),
    duvida: <StudyAssistantPanel className="h-[min(560px,60dvh)]" onReply={onReply} />,
  };

  const pomodoroLabel = pomodoro.started ? formatPomodoroTime(pomodoro.remainingSeconds) : 'Pomodoro';
  const leftTools: RailEntry[] = [
    ...(hasMaterial ? [{ id: 'material' as const, label: 'Material', icon: capeloIcon }] : []),
    { id: 'pomodoro', label: pomodoroLabel, live: pomodoro.isRunning },
  ];
  const rightTools: RailEntry[] = [
    { id: 'notas', label: 'Notas', icon: terminalIcon, dot: notesDraft },
    { id: 'duvida', label: 'Dúvida', icon: ajudaIcon, dot: unreadReply },
  ];

  const autoOpening =
    current && OPENING_TYPES.has(current.type) && chainMode === 'step' && current.responses.length === 0 && isFirstOfActivityGroup(daily, current) ? (
      <BlockOpening daily={daily} activity={current} />
    ) : null;
  // Reforço (Figma `28:282`): a abertura "Só o que escapou" vai no topo da 1ª etapa, no lugar da tela de entrada.
  const reinforcementOpening =
    daily.isReinforcement && current && sortedActivities(daily)[0]?.id === current.id && daily.activities.every((a) => a.responses.length === 0) ? (
      <FocadaLine label="Focada · reforço">
        Só o que escapou: {daily.activities.length === 1 ? 'a etapa' : `${daily.activities.length} etapas`} que você errou no Dia {daily.dayNumber}. Tudo certo vale +2 gems, e não gasta o Dia de hoje.
      </FocadaLine>
    ) : null;
  const shownOpening = opening === undefined ? (reinforcementOpening ?? autoOpening) : opening;

  const gauge = showGauge ? <SessionGauge daily={daily} current={current} /> : null;
  const back = onBack && !hideBack ? onBack : undefined;

  return (
    <div className="relative flex h-[calc(100dvh-64px-env(safe-area-inset-bottom))] flex-col overflow-hidden bg-base md:tela-cheia">
      {/* Topo do celular (Figma `17:1697`): a nav global some no /hoje abaixo de md. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b-2 border-stroke px-4 md:hidden">
        <Link to={weekly ? `/start?curso=${weekly.courseId}` : '/start'} className="text-rotulo-sm text-secondary hover:text-primary">
          ← Início
        </Link>
        <p className="truncate text-rotulo-sm">
          <span className="text-secondary">{dayCrumb}</span>
          {lastCrumb && (
            <>
              <span className="text-muted"> · </span>
              <span className="text-accent">{lastCrumb}</span>
            </>
          )}
        </p>
      </div>

      <Rail side="left" tools={leftTools} open={tool} onToggle={toggleTool} />
      <Rail side="right" tools={rightTools} open={tool} onToggle={toggleTool} />

      <div className="flex min-h-0 flex-1 justify-center px-4 md:px-28">
        <div className="flex min-h-0 w-full max-w-[720px] flex-col gap-4 pt-4 pb-4 md:gap-6 md:pt-8 md:pb-8 lg:short:gap-4 lg:short:pt-6 lg:short:pb-6">
          <header className="hidden shrink-0 items-center justify-between gap-4 md:flex">
            <Breadcrumb parts={[courseName, weekly && `Semana ${weekly.number}`, dayCrumb, lastCrumb]} />
            {gauge}
          </header>

          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="truncate text-lead text-primary md:text-titulo" title={title}>
                {title}
              </h1>
              {meta && <p className="hidden text-pequeno text-muted md:block">{meta}</p>}
            </div>
            <div className="md:hidden">{gauge}</div>
          </div>

          {chainMode !== 'none' && (
            <div className="shrink-0">
              <StageBar daily={daily} activityId={activityId} allDone={chainMode === 'done'} caption={mobileCaption} />
            </div>
          )}

          <section className={`flex min-h-0 shrink flex-col gap-4 md:border-2 md:p-6 ${TONE_CARD[tone]} max-md:border-0 max-md:bg-transparent ${centered ? 'md:my-auto' : ''}`}>
            <SessionFooterContext.Provider value={footerEl}>
              <ScrollArea className="min-h-0 flex-1" contentClassName={`flex flex-col gap-4 ${centered ? 'min-h-full justify-center' : ''}`}>
                {shownOpening}
                {eyebrow && <p className="hidden text-rotulo-sm text-secondary md:block">{eyebrow}</p>}
                {children}
              </ScrollArea>
            </SessionFooterContext.Provider>

            <div className="flex shrink-0 flex-col gap-3 empty:hidden md:flex-row md:flex-wrap md:items-center md:gap-4 [&:has(>div:empty):not(:has(>button))]:hidden">
              <div
                ref={setFooterEl}
                className="flex flex-col-reverse gap-3 empty:hidden md:flex-row-reverse md:flex-wrap md:items-center md:justify-end md:gap-4 [&>button]:max-md:w-full [&>a]:max-md:w-full"
              >
                {footer}
              </div>
              {back && (
                <>
                  <Button kind="secundario" onClick={back} className="hidden md:inline-flex">
                    Etapa anterior
                  </Button>
                  <button type="button" onClick={back} className="self-start text-rotulo-sm text-secondary hover:text-primary md:hidden">
                    ← Etapa anterior
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Barra de ferramentas do celular (Figma `17:1697`): os mesmos quatro itens dos trilhos. */}
      <nav
        aria-label="Ferramentas do dia"
        className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(64px+env(safe-area-inset-bottom))] grid-flow-col border-t-2 border-stroke bg-base pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {[...leftTools, ...rightTools].map((t) => (
          <RailItem key={t.id} entry={t} active={tool === t.id} onClick={() => toggleTool(t.id)} bar />
        ))}
      </nav>

      {(Object.keys(panels) as Tool[]).map((t) =>
        panels[t] ? (
          <ToolDrawer key={t} side={t === 'material' || t === 'pomodoro' ? 'left' : 'right'} title={TOOL_TITLE[t]} open={tool === t} onClose={closeTool}>
            {panels[t]}
          </ToolDrawer>
        ) : null,
      )}

      {jumpTarget && (
        <Modal label="Voltar pro material" eyebrow="Material" onClose={() => setJumpTarget(null)} width={480}>
          <FocadaLine size="devolutiva">{jumpTarget.message}</FocadaLine>
          <div className="flex flex-col gap-4 md:flex-row">
            <Button
              className="w-full md:w-auto"
              onClick={() => {
                if (goToActivity) goToActivity(jumpTarget.activityId);
                setJumpTarget(null);
              }}
            >
              Voltar pro material
            </Button>
            <Button kind="secundario" className="w-full md:w-auto" onClick={() => setJumpTarget(null)}>
              Ficar aqui
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Erros do dia (só depois do 1º erro; o reforço não conta), tentativas do passo (code comigo) ou missões do terminal. */
function SessionGauge({ daily, current }: { daily: DailyStateDto; current: DailyActivityDto | undefined }) {
  if (current?.type === ActivityType.CodeStep && current.codeStep) {
    const attempts = current.responses.length;
    if (attempts === 0) return null;
    return (
      <DayGauge
        label="Tentativas do passo"
        value={attempts}
        total={current.codeStep.maxAttempts}
        tone={current.responses.some((r) => r.passed) ? 'feito' : 'tentativa'}
        title={`Na ${current.codeStep.maxAttempts}ª tentativa sem passar, a solução do passo aparece`}
      />
    );
  }
  if (current?.type === ActivityType.TerminalMission && current.missions) return <MissionsGauge activity={current} />;
  if (daily.isReinforcement || daily.penaltyPoints === 0) return null;
  return (
    <DayGauge
      label="Erros do dia"
      value={daily.penaltyPoints}
      total={daily.penaltyThreshold}
      title={`${daily.penaltyThreshold} erros no dia geram um reforço`}
    />
  );
}

/** Missoes da atividade em tela ja cumpridas (estado em memoria, ver terminalMissionStore). */
function MissionsGauge({ activity }: { activity: DailyActivityDto }) {
  const total = activity.missions?.length ?? 0;
  const progress = useMissionProgress(activity.id, total, activity.responses.length > 0);
  return <DayGauge label="Missões" value={progress.passedWith.filter((c) => c !== null).length} total={total} tone="feito" title="Missão no terminal não tem nota nem tentativa" />;
}

interface RailEntry {
  id: Tool;
  label: string;
  icon?: string;
  /** Pomodoro rodando: rótulo verde. */
  live?: boolean;
  /** Ponto âmbar: rascunho não salvo, resposta não lida. */
  dot?: boolean;
}

/** Trilho de 64 na margem (Figma Trilho `13:566`), a partir de md. */
function Rail({ side, tools, open, onToggle }: { side: 'left' | 'right'; tools: RailEntry[]; open: Tool | null; onToggle: (t: Tool) => void }) {
  return (
    <nav
      aria-label={side === 'left' ? 'Material e Pomodoro' : 'Notas e dúvida'}
      className={`absolute top-8 z-10 hidden flex-col gap-2 md:flex lg:short:top-6 ${side === 'left' ? 'left-6 wide:left-8' : 'right-6 wide:right-8'}`}
    >
      {tools.map((t) => (
        <RailItem key={t.id} entry={t} active={open === t.id} onClick={() => onToggle(t.id)} />
      ))}
    </nav>
  );
}

/** Trilho/Item (Figma `13:565`): Padrão, Ativo (gaveta aberta) e Com ponto. */
function RailItem({ entry, active, onClick, bar = false }: { entry: RailEntry; active: boolean; onClick: () => void; bar?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={entry.label === 'Pomodoro' || !entry.live ? entry.label : `Pomodoro, ${entry.label}`}
      className={`relative flex flex-col items-center justify-center gap-2 ${
        bar ? 'h-16 border-r-2 border-stroke last:border-r-0' : 'size-16 border-2 bg-base'
      } ${bar ? (active ? 'bg-accent-tint text-accent' : 'text-secondary') : active ? 'border-accent text-accent' : 'border-stroke text-secondary hover:border-stroke-strong hover:text-primary'}`}
    >
      {entry.icon ? (
        <img src={entry.icon} alt="" aria-hidden="true" className="size-4 pixelated" />
      ) : (
        <span aria-hidden="true" className={`size-4 ${entry.live ? 'bg-accent' : 'bg-stroke-strong'}`} />
      )}
      <span className={`font-pixel-label text-[8px] leading-[10px] tracking-[0.04em] uppercase ${entry.live ? 'text-accent' : ''}`}>{entry.label}</span>
      {entry.dot && <span className="absolute top-1.5 right-1.5 size-2 bg-project" aria-label="novidade" />}
    </button>
  );
}

/**
 * Gaveta da sessão (Figma Gaveta `13:579`): 360 colada no lado do trilho que abriu, logo abaixo da nav;
 * no celular, de baixo, acima da barra de ferramentas. O conteúdo fica montado o tempo todo (rascunho,
 * conversa e Pomodoro não reiniciam ao fechar); fechada, fica invisível e fora da ordem do Tab. Esc fecha
 * e os atalhos da sessão (1-N, Enter) ficam pausados enquanto ela está aberta.
 */
function ToolDrawer({ side, title, open, onClose, children }: { side: 'left' | 'right'; title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const resume = pauseSessionKeys();
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onClose();
    }
    window.addEventListener('keydown', onKey, true);
    return () => {
      resume();
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  return (
    <div className={open ? '' : 'invisible'} aria-hidden={!open}>
      <div className="fixed inset-x-0 top-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 bg-base/72 md:top-[var(--nav-height)] md:bottom-0" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-label={title}
        className={`fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-50 flex max-h-[calc(100dvh-56px-64px)] flex-col border-2 border-stroke-strong bg-surface md:top-[var(--nav-height)] md:bottom-0 md:max-h-none md:w-[360px] ${
          side === 'left' ? 'md:right-auto md:shadow-[4px_4px_0_0_var(--color-stroke-strong)]' : 'md:left-auto md:shadow-[-4px_4px_0_0_var(--color-stroke-strong)]'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-stroke px-4 py-4 md:px-6">
          <p className="text-rotulo text-accent">{title}</p>
          <button type="button" onClick={onClose} className="text-rotulo-sm text-secondary hover:text-primary">
            Fechar · Esc
          </button>
        </div>
        {/* Os painéis antigos (Material, Pomodoro, Notas, Dúvida) vêm com a moldura dupla `pixel-box`: dentro da gaveta ela some (sistema.md §7). */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6 [&_.pixel-box]:border-0 [&_.pixel-box]:bg-transparent [&_.pixel-box]:p-0 [&_.pixel-box]:shadow-none [&_.pixel-box]:[clip-path:none]">
          {children}
        </div>
      </section>
    </div>
  );
}
