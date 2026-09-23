import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { DailyStatus, PROJECT_LANGUAGE_NAMES, ProjectLanguage, ProjectLanguageStep, WeeklyProjectStatus, type ForgejoTokenDto, type ProjectReferenceDto, type WeeklyDetailDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { MarkdownBlock } from '../components/activities/MarkdownBlock';
import { ProgressBar } from '../components/ProgressBar';
import { ScrollArea } from '../components/ScrollArea';
import { StudyAssistantPanel } from '../components/assistant/StudyAssistantPanel';
import backArrow from '../assets/pixel/voltar.png';
import terminalIcon from '../assets/pixel/terminal.png';
import { CardLabel } from '../components/CardLabel';
import { QuickNotePanel } from '../components/notebook/QuickNotePanel';
import { setStudyAssistantContext } from '../lib/studyAssistantContext';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';
import { DialogueBox } from '../components/DialogueBox';
import { PixelConfirmDialog } from '../components/PixelConfirmDialog';
import { buildFocadaLines } from '../lib/focadaLines';

const STATUS_BADGE: Record<number, { label: string; className: string }> = {
  [WeeklyProjectStatus.Pending]: { label: 'PENDENTE', className: 'bg-surface-alt text-alert' },
  [WeeklyProjectStatus.Submitted]: { label: 'AGUARDANDO AVALIAÇÃO', className: 'bg-surface-alt text-project' },
  [WeeklyProjectStatus.Evaluated]: { label: 'AVALIADO', className: 'bg-surface-alt text-accent' },
};

// Fase 38: mesma prioridade de WeeklyProjectCard - IsLocked vence Status (so coexiste com Pending).
const LOCKED_BADGE = { label: 'BLOQUEADO', className: 'bg-surface-alt text-muted' };

// Progresso do topo = progresso da SEMANA (pedido do dono, 23/09/2026): mesma conta da
// WeeklyDetailPage (dias originais concluidos, sem reforco) com o projeto como ultima etapa -
// sem ele a barra estaria sempre cheia aqui, ja que o projeto so desbloqueia com os dias feitos.
// Projeto conta ao ser entregue (Submitted ja e "a parte do aluno feita"; a avaliacao e automatica).
// Antes era derivada so do Status (33/67/100%), parada em 33% o trabalho inteiro.
function weekProgress(weekly: WeeklyDetailDto): { done: number; total: number } {
  const days = weekly.dailies.filter((d) => !d.isReinforcement);
  const daysDone = days.filter((d) => d.status === DailyStatus.Completed).length;
  const projectDone = weekly.project !== null && weekly.project.status !== WeeklyProjectStatus.Pending;
  return { done: daysDone + (projectDone ? 1 : 0), total: days.length + (weekly.project ? 1 : 0) };
}

/**
 * Projeto semanal (design Figma "projeto-semanal", Fase 7) - WeeklyProject existe no dominio desde
 * a Fase 1 (SpecText/Status/SubmissionUrl) mas nunca teve tela. O mock do Figma mostra
 * titulo/objetivos/recursos como campos separados; o dominio so guarda 1 texto livre (SpecText,
 * ver seed) - por isso aqui SpecText vira o corpo do card inteiro, sem inventar uma estrutura que
 * a Api nao tem.
 */
export function WeeklyProjectPage({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const { data: weekly, error, loading, retry } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Fase 64: entrega passa por confirmacao (a avaliacao roda na hora e nao aceita reenvio depois).
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  // Fase 59 (piloto Semana 1): escolha da linguagem, em 2 passos (decisao do dono - a escolha e
  // definitiva, sem troca pelo proprio aluno depois). pendingLanguage nulo = passo 1 (escolher
  // uma das choosableLanguages); preenchido = passo 2 (confirmar ou cancelar).
  const [pendingLanguage, setPendingLanguage] = useState<ProjectLanguage | null>(null);
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const [chooseLanguageError, setChooseLanguageError] = useState<string | null>(null);

  // Fase 32: SessionLayout faz isso sozinho via `assistantContext` (ver SessionShell.tsx) - esta
  // tela nao usa SessionLayout (layout proprio desde a Fase 61, chat em StudyAssistantPanel), entao alimenta o
  // Suporte Rapido de IA com a especificacao do projeto direto aqui. Fase 59: specText vem vazio
  // enquanto o projeto nao foi disponibilizado (aluno ainda precisa marcar/escolher linguagem) -
  // sem contexto nenhum nesse caso, em vez de mandar uma string vazia pro assistente.
  useEffect(() => {
    if (!weekly?.project?.specText) return;
    setStudyAssistantContext(
      `Projeto da Semana ${weekly.number}: ${weekly.title}\n\nEspecificação do projeto:\n${weekly.project.specText}`,
    );
    return () => setStudyAssistantContext(null);
  }, [weekly]);

  // Fase 64: falas da Focada (briefing da curadoria + fala do estado atual do projeto).
  const focadaLines = useMemo(() => (weekly?.project ? buildFocadaLines(weekly.project) : []), [weekly]);

  if (loading) return <Centered text="Carregando projeto..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const backTo = `/start?course=${courseId ?? ''}&weekly=${weeklyId}`;
  const progress = weekProgress(weekly);
  if (!weekly.project) {
    return <Centered text="Esta semana ainda não tem projeto definido." />;
  }

  const project = weekly.project;
  const badge = project.isLocked ? LOCKED_BADGE : STATUS_BADGE[project.status];
  const canSubmit = project.status !== WeeklyProjectStatus.Evaluated && !project.isLocked;
  // Fase 59: None (semana fora do piloto) e Chosen sao os 2 estados em que o projeto de fato foi
  // disponibilizado - specText/submissionUrl so vem preenchido neles (ver WeeklyProjectDtoMapper
  // no backend). NeedsPreference/NeedsChoice mostram um card no lugar da especificacao, abaixo.
  const released = project.languageStep === ProjectLanguageStep.Chosen || project.languageStep === ProjectLanguageStep.None;
  // Fase 64: com briefing curado, a Focada fala o tempo todo no centro da tela. A especificacao so sai
  // da tela quando o repositorio ja veio de um template por linguagem (Chosen) - e ali, no README.md,
  // que ela mora agora; semana sem template (ou sem briefing) segue com o cartao de especificacao.
  const showDialogue = released && !project.isLocked && focadaLines.length > 0;
  const specInReadme = showDialogue && project.languageStep === ProjectLanguageStep.Chosen;

  // Repositorio de Projeto Semanal e provisionado pela Focadu (fork no Forgejo interno, ver
  // secret/rascunhos/repositorios-gerenciados-projeto-semanal.md) - o aluno nao digita mais URL
  // nenhuma, so confirma que terminou o trabalho no repositorio que ja recebeu.
  async function handleSubmit() {
    if (!project.submissionUrl) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.submitWeeklyProject(weeklyId, project.submissionUrl);
      window.location.reload(); // mais simples que replicar o refetch aqui - so essa tela usa este caso de uso.
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível enviar. Tente de novo.');
      setSubmitting(false);
    }
  }

  // Fase 59: confirmar de verdade faz o fork no Forgejo (pode demorar um pouco) e so entao
  // disponibiliza o projeto - reload() pelo mesmo motivo de handleSubmit, o DTO inteiro muda
  // de estado (languageStep, specText, submissionUrl, references...) e nao vale a pena replicar
  // esse refetch aqui.
  async function handleConfirmLanguage() {
    if (pendingLanguage === null) return;
    setChoosingLanguage(true);
    setChooseLanguageError(null);
    try {
      await api.chooseWeeklyProjectLanguage(weeklyId, pendingLanguage);
      window.location.reload();
    } catch (err) {
      setChooseLanguageError(err instanceof ApiError ? err.message : 'Não foi possível confirmar a linguagem. Tente de novo.');
      setChoosingLanguage(false);
    }
  }

  // Fase 61 (Figma "LAYOUT CRU - PROJETO SEMANAL", node 178:132): a pagina ocupa exatamente a
  // altura que sobra abaixo do GlobalNav (`--nav-height`, index.css) e NUNCA rola por fora - cada
  // cartao rola por dentro com <ScrollArea>. Abaixo de `lg` (3 colunas nao cabem) volta pro fluxo
  // normal empilhado, com rolagem da pagina - ver docs/fase-61.
  return (
    <div className="flex flex-col gap-6 bg-base px-4 pt-6 pb-8 lg:h-[calc(100dvh-var(--nav-height))] lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12">
      {/* Topo: "voltar" a esquerda e a barra de progresso CENTRALIZADA (250px), como no Figma. Fase 64
          (pedido do dono): some com o dialogo da Focada - a tela fica so com as 3 colunas; volta-se pelo
          menu (Trilhas) ou pelo navegador. */}
      {!showDialogue && (
        <div className="flex shrink-0 flex-col gap-3 lg:grid lg:grid-cols-[1fr_minmax(0,250px)_1fr] lg:items-center lg:gap-4">
          <Link
            to={backTo}
            className="flex min-w-0 items-center gap-2 text-sm font-medium uppercase tracking-[1.6px] text-secondary hover:text-primary"
          >
            <img src={backArrow} alt="" width={16} height={16} className="size-4 shrink-0 pixelated" />
            <span className="truncate">Voltar para {weekly.theme ?? weekly.title}</span>
          </Link>
          <div
            role="progressbar"
            aria-label={`Progresso da Semana ${weekly.number}: ${progress.done} de ${progress.total} etapas`}
            aria-valuenow={progress.done}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            title={`${progress.done} de ${progress.total} etapas da semana (dias + projeto)`}
          >
            <ProgressBar progress={progress.total ? progress.done / progress.total : 0} tone="project" heightClass="h-2" />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row">
        {/* Coluna esquerda (Fase 63): repositorio em cima (altura do conteudo) e referencias ocupando
            o resto - so depois do projeto disponibilizado. */}
        {released && (project.submissionUrl || project.references.length > 0) && (
          <div className="flex min-h-0 flex-col gap-8 lg:w-[250px] lg:shrink-0">
            {project.submissionUrl && (
              <RepositoryPanel
                submissionUrl={project.submissionUrl}
                username={project.forgejoUsername}
                tokenLastEight={project.forgejoTokenLastEight}
              />
            )}
            {project.references.length > 0 && (
              <ReferencesPanel
                references={project.references}
                languageName={project.language !== null ? PROJECT_LANGUAGE_NAMES[project.language] : null}
              />
            )}
          </div>
        )}

        {/* Centro: especificacao rola por dentro; a entrega fica fixa no rodape do cartao, sempre
            visivel, sem precisar rolar ate o fim da especificacao. */}
        {/* Fase 64 (pedido do dono): com o dialogo da Focada o centro deixa de ser cartao - sem borda ambar,
            sem fundo, sem rotulo "Desafio semanal" e sem o recuo interno; o dialogo alinha no topo com os
            cartoes laterais e usa a largura toda da coluna. */}
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${showDialogue ? '' : 'rounded-2xl border-[1.5px] border-project bg-surface'}`}
        >
          <ScrollArea
            className="min-h-0 flex-1"
            // pr-3: respiro pra barra fina do ScrollArea nao passar por cima da borda das caixas de dialogo.
            contentClassName={showDialogue ? 'flex flex-col gap-6 pr-3 pb-6 lg:pb-10' : 'flex flex-col gap-6 px-[18px] pt-4 pb-6 lg:pb-10'}
          >
            {!showDialogue && <CardLabel>Desafio semanal</CardLabel>}
            <div className={`flex flex-col gap-6 ${showDialogue ? '' : 'lg:px-[22px]'}`}>
              {/* Fase 64 (pedido do dono): com o dialogo da Focada, sem as tags "CHEFE DE FASE"/status e sem
                  o titulo visivel - a Focada ja diz o que e e em que pe esta. O titulo fica pra leitor de tela. */}
              {!showDialogue && (
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-project bg-project/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.5px] text-project">
                    CHEFE DE FASE 👾
                  </span>
                  <span className={`rounded-md px-3 py-1.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <h1 className={showDialogue ? 'sr-only' : 'text-[28px] font-bold text-primary'}>Projeto da Semana {weekly.number}</h1>

                {/* Fase 38: trava tudo abaixo enquanto a Weekly ainda tem Daily original nao concluida
                    (Weekly.AreDailiesComplete) - inclusive a escolha de linguagem (Fase 59): "so depois
                    de desbloqueado" (decisao do dono), pra nao mostrar um seletor que o backend so
                    aceitaria depois. */}
                {project.isLocked ? (
                  <p className="flex items-center gap-2 rounded-xl border border-stroke bg-surface-alt px-4 py-3 text-sm text-secondary">
                    <img src={lockIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
                    Termine todas as dailies desta semana para desbloquear o projeto.
                  </p>
                ) : project.languageStep === ProjectLanguageStep.NeedsPreference ? (
                  <LanguagePreferenceNeeded />
                ) : project.languageStep === ProjectLanguageStep.NeedsChoice ? (
                  <LanguagePicker
                    choosableLanguages={project.choosableLanguages}
                    pendingLanguage={pendingLanguage}
                    onPick={setPendingLanguage}
                    onCancel={() => {
                      setPendingLanguage(null);
                      setChooseLanguageError(null);
                    }}
                    onConfirm={handleConfirmLanguage}
                    submitting={choosingLanguage}
                    error={chooseLanguageError}
                  />
                ) : (
                  // SpecText e Markdown curado (titulos "###", listas, negrito/codigo inline) - antes ia
                  // num <p whitespace-pre-line> e a sintaxe aparecia crua na tela. Mesmo renderizador das
                  // leituras.
                  <>
                    {showDialogue && (
                      <DialogueBox
                        key={`${project.id}:${focadaLines.length}`}
                        projectId={project.id}
                        lines={focadaLines}
                        readmeUrl={specInReadme ? project.submissionUrl : null}
                        // Fase 64: entregar vira resposta do agente no dialogo, no lugar do botao do rodape.
                        choices={
                          canSubmit && project.submissionUrl
                            ? [{ label: submitting ? 'Enviando...' : 'Entregar projeto. Já commitei tudo.', onSelect: () => setConfirmingSubmit(true), disabled: submitting }]
                            : []
                        }
                        choicesNote={submitError}
                      />
                    )}
                    {!specInReadme && <MarkdownBlock text={project.specText} />}
                  </>
                )}
              </div>

              {released && (
                <>
                  {!showDialogue && <div className="h-px bg-stroke" />}

                  {/* Fase 27b: Score/Feedback existem no dominio desde a Fase 16 mas nunca apareciam
                      aqui - nada disparava a avaliacao pela UI antes desta fase (ver
                      SubmitWeeklyProjectUseCase). Estilo proprio (nao FeedbackPanel, usado pelas 5
                      atividades da Daily) porque projeto nao tem conceito de passed/reprovado - uma vez
                      avaliado, nao ha reenvio (WeeklyProject.Submit bloqueia depois de Evaluated), so a
                      nota fica registrada. */}
                  {project.status === WeeklyProjectStatus.Evaluated && (
                    <div className="flex flex-col gap-3 rounded-xl border border-project/40 bg-surface-alt p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Avaliação</p>
                        <p className="text-2xl font-bold text-project">
                          {project.score}
                          <span className="text-sm font-medium text-muted">/100</span>
                        </p>
                      </div>
                      {project.feedback && <p className="text-sm text-secondary">{project.feedback}</p>}
                    </div>
                  )}

                  {!project.submissionUrl && (
                    <p className="rounded-xl border border-alert/40 bg-surface-alt px-4 py-3 text-sm text-alert">
                      Seu repositório ainda não foi provisionado - tente recarregar a página em alguns instantes.
                    </p>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {canSubmit && project.submissionUrl && !showDialogue && (
            <div className="flex shrink-0 flex-col gap-3 border-t border-stroke px-6 py-5 lg:px-10">
              {/* Repositorio gerenciado no Forgejo interno e avaliado automaticamente ao entregar
                  (ver EvaluateWeeklyProjectUseCase) - nao ha mais URL pra colar, so confirmar que
                  o trabalho no repositorio ja provisionado esta pronto. */}
              <p className="text-xs text-muted">Terminou de commitar seu código? Entregue para receber nota automática.</p>

              {submitError && <p className="text-sm text-alert">{submitError}</p>}

              <button
                type="button"
                onClick={() => setConfirmingSubmit(true)}
                disabled={submitting}
                className="self-end rounded-xl bg-project px-8 py-4 text-sm font-bold text-base disabled:opacity-40"
              >
                {submitting ? 'ENVIANDO...' : 'ENTREGAR PROJETO'}
              </button>
            </div>
          )}
        </div>

        {/* Coluna direita (Fase 63): anotacao rapida (264px - 240px do Figma + 10%, pedido do dono 23/09/2026 - presa ao PROJETO, nao a uma Daily) + chat
            ocupando o resto da altura. */}
        <div className="flex min-h-0 flex-col gap-8 lg:w-[250px] lg:shrink-0">
          <QuickNotePanel fill target={{ weeklyId }} courseId={weekly.courseId} className="h-[264px]" />
          <StudyAssistantPanel tall className="h-[480px] lg:h-auto lg:min-h-0 lg:flex-1" />
        </div>
      </div>

      <PixelConfirmDialog
        open={confirmingSubmit}
        message="Tem certeza, agente? A avaliação vai ler o que está no seu repositório agora, e depois dela não dá para entregar de novo."
        cancelLabel="Não, ainda vou mexer."
        confirmLabel="Sim, entregar agora."
        onCancel={() => setConfirmingSubmit(false)}
        onConfirm={() => {
          setConfirmingSubmit(false);
          void handleSubmit();
        }}
      />
    </div>
  );
}

/**
 * Tipografia (ajuste pixel art, 23/09/2026 - mesma linguagem dos cartoes laterais da trilha,
 * CourseDetailPage): rotulos e botoes em Silkscreen 10px (`font-pixel-label`), texto corrido,
 * link e credenciais em VT323 18px (`font-pixel text-lg`), cartao em `pixel-box` e campos com
 * borda de 2px reta. Aviso do token em alert/80 (a 50% nao tinha contraste no fundo escuro).
 *
 * Cartao "REPOSITORIO" (Fase 63, Figma node 178:132): icone de terminal + caixa com o link do
 * repositorio (so a URL - o comando inteiro fica no botao de copiar, pedido do dono),
 * botao que copia o comando, e as credenciais do git (usuario e token) com icone de copiar.
 *
 * Fase 60: a Focadu nao guarda o token do git. O Figma desenha o estado "token recem-gerado"
 * (caixa tracejada vermelha + aviso); sem token na tela, a caixa mostra o final do token valendo e o
 * botao GERAR - gerar de novo revoga o anterior no Forgejo, por isso a confirmacao quando ja existe
 * um (`tokenLastEight`). O token gerado so vive em state, some ao recarregar.
 */
function RepositoryPanel({
  submissionUrl,
  username,
  tokenLastEight,
}: {
  submissionUrl: string;
  username: string | null;
  tokenLastEight: string | null;
}) {
  const [generated, setGenerated] = useState<ForgejoTokenDto | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'clone' | 'username' | 'token' | null>(null);
  const cloneCommand = `git clone ${submissionUrl}`;
  const currentLastEight = generated ? generated.accessToken.slice(-8) : tokenLastEight;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      setGenerated(await api.generateForgejoToken());
      setConfirming(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível gerar o token. Tente de novo.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(what: 'clone' | 'username' | 'token', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2000);
    } catch {
      // Clipboard indisponivel (ex: contexto nao seguro) - sem tratamento especial, so nao copia.
    }
  }

  return (
    <ScrollArea className="pixel-box shrink-0 bg-base" contentClassName="flex flex-col p-5">
      <CardLabel pixel>Repositório</CardLabel>

      <div className="mt-3 flex items-center gap-2">
        <img src={terminalIcon} alt="" width={48} height={48} className="size-12 shrink-0 pixelated" />
        <a
          href={submissionUrl}
          target="_blank"
          rel="noreferrer"
          title={submissionUrl}
          className="min-w-0 flex-1 border-2 border-dashed border-stroke px-2 py-1 font-pixel text-lg leading-tight text-secondary hover:border-accent hover:text-primary"
        >
          {/* line-clamp num span proprio: no <a> com padding, a 3a linha vazava no padding de baixo. */}
          <span className="line-clamp-2 break-all">{submissionUrl}</span>
        </a>
      </div>

      <button
        type="button"
        onClick={() => handleCopy('clone', cloneCommand)}
        className="mt-3 bg-accent py-2.5 font-pixel-label text-[10px] text-base hover:brightness-110"
      >
        {copied === 'clone' ? 'Copiado ✓' : 'Copiar git clone'}
      </button>

      <p className="mt-3 font-pixel text-lg leading-snug text-secondary">
        O git vai pedir usuário e senha na hora do push - utilize as credenciais abaixo.
      </p>

      {username && (
        <>
          <p className="mt-5 font-pixel-label text-[10px] text-secondary">Usuário do git</p>
          <div className="mt-2 flex min-h-9 items-center gap-2 border-2 border-stroke py-1 pl-2 pr-2">
            <code className="min-w-0 flex-1 break-all font-pixel text-lg leading-tight text-primary">{username}</code>
            <CopyIconButton label="Copiar usuário do git" copied={copied === 'username'} onClick={() => handleCopy('username', username)} />
          </div>

          <p className="mt-4 font-pixel-label text-[10px] text-secondary">Token (use como senha)</p>
          {generated ? (
            <>
              <div className="mt-2 flex min-h-9 items-center gap-2 border-2 border-dashed border-alert/60 py-1 pl-2 pr-2">
                <code className="min-w-0 flex-1 break-all font-pixel text-lg leading-tight text-primary">{generated.accessToken}</code>
                <CopyIconButton label="Copiar token" copied={copied === 'token'} onClick={() => handleCopy('token', generated.accessToken)} />
              </div>
              <p className="mt-2 font-pixel text-lg leading-snug text-alert/80">
                Copie agora: por segurança a Focadu não guarda o token, ele não aparece de novo depois que você sair desta tela.
              </p>
            </>
          ) : (
            <>
              <div className="mt-2 flex min-h-9 items-center gap-2 border-2 border-stroke py-1 pl-2 pr-2">
                <code className="min-w-0 flex-1 font-pixel text-lg leading-tight text-muted">
                  {currentLastEight ? `…${currentLastEight}` : 'nenhum token gerado'}
                </code>
                {!confirming && (
                  <button
                    type="button"
                    onClick={currentLastEight ? () => setConfirming(true) : handleGenerate}
                    disabled={generating}
                    className="shrink-0 font-pixel-label text-[10px] text-accent hover:underline disabled:opacity-50"
                  >
                    {generating ? 'Gerando...' : 'Gerar'}
                  </button>
                )}
              </div>
              {confirming && (
                <div className="mt-2 flex flex-col gap-2">
                  <p className="font-pixel text-lg leading-snug text-secondary">O token atual deixa de funcionar. Gerar outro?</p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="font-pixel-label text-[10px] text-accent hover:underline disabled:opacity-50"
                    >
                      {generating ? 'Gerando...' : 'Gerar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      disabled={generating}
                      className="font-pixel-label text-[10px] text-secondary hover:text-primary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {error && <p className="mt-2 font-pixel text-lg leading-snug text-alert">{error}</p>}
        </>
      )}
    </ScrollArea>
  );
}

/** Icone de copiar do Figma (dois quadrados de 8px sobrepostos, cantos retos) - vira ✓ por 2s depois de copiar. */
function CopyIconButton({ label, copied, onClick }: { label: string; copied: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="relative size-4 shrink-0">
      {copied ? (
        <span className="font-pixel text-lg leading-none text-accent">✓</span>
      ) : (
        <>
          <span className="absolute left-[7px] top-[7px] size-2 border border-accent" />
          <span className="absolute left-1 top-1 size-2 bg-accent/30" />
        </>
      )}
    </button>
  );
}

/**
 * Cartao de referencias (Fase 59; coluna esquerda desde a Fase 63): links de referencia (biblioteca/documentacao) da linguagem escolhida +
 * os comuns a todas, curados manualmente - so vem preenchido com languageStep Chosen. Itens no
 * mesmo desenho dos atalhos da trilha (`SideLink` do CourseDetailPage: borda de 2px que acende no hover).
 */
function ReferencesPanel({ references, languageName }: { references: ProjectReferenceDto[]; languageName: string | null }) {
  return (
    <ScrollArea className="pixel-box min-h-[200px] bg-base lg:min-h-0 lg:flex-1" contentClassName="flex flex-col gap-3 p-5">
      <CardLabel pixel>Referências{languageName && ` (${languageName})`}</CardLabel>
      <div className="flex flex-col gap-2">
        {references.map((reference) => (
          <a
            key={reference.id}
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-0.5 border-2 border-stroke px-3 py-2 hover:border-accent"
          >
            <span className="font-pixel text-xl leading-tight text-accent">{reference.title}</span>
            <span className="font-pixel text-lg leading-snug text-secondary">{reference.documents}</span>
          </a>
        ))}
      </div>
    </ScrollArea>
  );
}

/** Fase 59: semana com variantes de linguagem, mas o aluno ainda nao marcou nenhuma delas no perfil - so isso, ate ele marcar. */
function LanguagePreferenceNeeded() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-alert/40 bg-surface-alt px-4 py-3">
      <p className="text-sm text-secondary">
        Esse projeto tem repositório-modelo e referências próprias por linguagem, mas você ainda não marcou nenhuma linguagem
        no seu perfil.
      </p>
      <Link to="/onboarding/perfil?edit=1" className="w-fit text-sm font-semibold text-accent hover:underline">
        Marcar no meu perfil →
      </Link>
    </div>
  );
}

/**
 * Fase 59: escolha da linguagem em 2 passos - `pendingLanguage` nulo mostra os botoes de escolha
 * (passo 1); preenchido mostra a confirmacao (passo 2), unico jeito de chegar em `onConfirm`.
 * Decisao do dono: a escolha e definitiva, sem troca pelo proprio aluno depois - por isso o passo
 * de confirmacao existe, pra reduzir clique errado.
 */
function LanguagePicker({
  choosableLanguages,
  pendingLanguage,
  onPick,
  onCancel,
  onConfirm,
  submitting,
  error,
}: {
  choosableLanguages: ProjectLanguage[];
  pendingLanguage: ProjectLanguage | null;
  onPick: (language: ProjectLanguage) => void;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-project/40 bg-surface-alt p-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-primary">Escolha a linguagem deste projeto</p>
        <p className="text-sm text-secondary">
          Esse projeto tem repositório-modelo e referências próprias por linguagem. Depois de confirmar, não dá mais pra
          trocar.
        </p>
      </div>

      {pendingLanguage === null ? (
        <div className="flex flex-wrap gap-3">
          {choosableLanguages.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => onPick(language)}
              className="rounded-xl border border-project bg-surface px-6 py-3 text-sm font-bold text-primary hover:bg-project/10"
            >
              {PROJECT_LANGUAGE_NAMES[language]}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-alert/40 bg-base p-4">
          <p className="text-sm text-primary">
            Confirma <strong>{PROJECT_LANGUAGE_NAMES[pendingLanguage]}</strong> pra este projeto? Depois de confirmar, não dá
            mais pra trocar de linguagem aqui.
          </p>
          {error && <p className="text-sm text-alert">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onCancel} disabled={submitting} className="text-sm text-secondary hover:text-primary disabled:opacity-40">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="rounded-xl bg-project px-6 py-3 text-sm font-bold text-base disabled:opacity-40"
            >
              {submitting ? 'CONFIRMANDO...' : `CONFIRMAR ${PROJECT_LANGUAGE_NAMES[pendingLanguage].toUpperCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
