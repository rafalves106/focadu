import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { PROJECT_LANGUAGE_NAMES, ProjectLanguage, ProjectLanguageStep, WeeklyProjectStatus, type ForgejoTokenDto, type ProjectReferenceDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { MarkdownBlock } from '../components/activities/MarkdownBlock';
import { ProgressBar } from '../components/ProgressBar';
import { ScrollArea } from '../components/ScrollArea';
import { StudyAssistantPanel } from '../components/assistant/StudyAssistantPanel';
import backArrow from '../assets/project/back-arrow.svg';
import { setStudyAssistantContext } from '../lib/studyAssistantContext';

const STATUS_BADGE: Record<number, { label: string; className: string }> = {
  [WeeklyProjectStatus.Pending]: { label: 'PENDENTE', className: 'bg-surface-alt text-alert' },
  [WeeklyProjectStatus.Submitted]: { label: 'AGUARDANDO AVALIAÇÃO', className: 'bg-surface-alt text-project' },
  [WeeklyProjectStatus.Evaluated]: { label: 'AVALIADO', className: 'bg-surface-alt text-accent' },
};

// Fase 38: mesma prioridade de WeeklyProjectCard - IsLocked vence Status (so coexiste com Pending).
const LOCKED_BADGE = { label: 'BLOQUEADO', className: 'bg-surface-alt text-muted' };

// Progresso do topo e derivado do Status (sem campo de deadline no dominio - WeeklyProject so tem
// SpecText/Status/SubmissionUrl, ver Focadu.Domain.Weeklies.WeeklyProject) - nao ha "% concluido"
// real alem disso.
const STATUS_PROGRESS: Record<number, number> = {
  [WeeklyProjectStatus.Pending]: 1 / 3,
  [WeeklyProjectStatus.Submitted]: 2 / 3,
  [WeeklyProjectStatus.Evaluated]: 1,
};

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

  if (loading) return <Centered text="Carregando projeto..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const backTo = `/start?course=${courseId ?? ''}&weekly=${weeklyId}`;
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
  // altura que sobra abaixo do GlobalNav (h-14 + 1px de borda = 57px) e NUNCA rola por fora - cada
  // cartao rola por dentro com <ScrollArea>. Abaixo de `lg` (3 colunas nao cabem) volta pro fluxo
  // normal empilhado, com rolagem da pagina - ver docs/fase-61.
  return (
    <div className="flex flex-col gap-6 bg-base px-4 pt-6 pb-8 lg:h-[calc(100dvh-57px)] lg:overflow-hidden lg:px-16 lg:pt-[45px] lg:pb-12">
      {/* Topo: "voltar" a esquerda e a barra de progresso CENTRALIZADA (250px), como no Figma. */}
      <div className="flex shrink-0 flex-col gap-3 lg:grid lg:grid-cols-[1fr_minmax(0,250px)_1fr] lg:items-center lg:gap-4">
        <Link
          to={backTo}
          className="flex min-w-0 items-center gap-2 text-sm font-medium uppercase tracking-[1.6px] text-secondary hover:text-primary lg:text-[16px]"
        >
          <img src={backArrow} alt="" width={17} height={7.36} className="shrink-0" />
          <span className="truncate">Voltar para {weekly.theme ?? weekly.title}</span>
        </Link>
        <div role="progressbar" aria-label={`Projeto Semanal — Semana ${weekly.number}`} aria-valuenow={Math.round(STATUS_PROGRESS[project.status] * 100)} aria-valuemin={0} aria-valuemax={100}>
          <ProgressBar progress={STATUS_PROGRESS[project.status]} tone="project" heightClass="h-2" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row">
        {/* Coluna esquerda: repositorio - so depois do projeto disponibilizado. */}
        {released && project.submissionUrl && (
          <RepositoryPanel
            submissionUrl={project.submissionUrl}
            username={project.forgejoUsername}
            tokenLastEight={project.forgejoTokenLastEight}
          />
        )}

        {/* Centro: especificacao rola por dentro; a entrega fica fixa no rodape do cartao, sempre
            visivel, sem precisar rolar ate o fim da especificacao. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border-[1.5px] border-project bg-surface">
          <ScrollArea className="min-h-0 flex-1" contentClassName="flex flex-col gap-6 p-6 lg:p-10">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-project bg-project/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.5px] text-project">
                CHEFE DE FASE 👾
              </span>
              <span className={`rounded-md px-3 py-1.5 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="text-[28px] font-bold text-primary">Projeto da Semana {weekly.number}</h1>

              {/* Fase 38: trava tudo abaixo enquanto a Weekly ainda tem Daily original nao concluida
                  (Weekly.AreDailiesComplete) - inclusive a escolha de linguagem (Fase 59): "so depois
                  de desbloqueado" (decisao do dono), pra nao mostrar um seletor que o backend so
                  aceitaria depois. */}
              {project.isLocked ? (
                <p className="rounded-xl border border-stroke bg-surface-alt px-4 py-3 text-sm text-secondary">
                  🔒 Termine todas as dailies desta semana para desbloquear o projeto.
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
                <MarkdownBlock text={project.specText} />
              )}
            </div>

            {released && (
              <>
                <div className="h-px bg-stroke" />

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
          </ScrollArea>

          {canSubmit && project.submissionUrl && (
            <div className="flex shrink-0 flex-col gap-3 border-t border-stroke px-6 py-5 lg:px-10">
              {/* Repositorio gerenciado no Forgejo interno e avaliado automaticamente ao entregar
                  (ver EvaluateWeeklyProjectUseCase) - nao ha mais URL pra colar, so confirmar que
                  o trabalho no repositorio ja provisionado esta pronto. */}
              <p className="text-xs text-muted">Terminou de commitar seu código? Entregue para receber nota automática.</p>

              {submitError && <p className="text-sm text-alert">{submitError}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="self-end rounded-xl bg-project px-8 py-4 text-sm font-bold text-base disabled:opacity-40"
              >
                {submitting ? 'ENVIANDO...' : 'ENTREGAR PROJETO'}
              </button>
            </div>
          )}
        </div>

        {/* Coluna direita: referencias (cartao baixo, 240px) + chat ocupando o resto da altura. */}
        <div className="flex min-h-0 flex-col gap-8 lg:w-[250px] lg:shrink-0">
          {released && project.references.length > 0 && (
            <ReferencesPanel
              references={project.references}
              languageName={project.language !== null ? PROJECT_LANGUAGE_NAMES[project.language] : null}
            />
          )}
          <StudyAssistantPanel tall className="h-[480px] lg:h-auto lg:min-h-0 lg:flex-1" />
        </div>
      </div>
    </div>
  );
}

/**
 * Coluna esquerda: repositorio gerenciado no Forgejo interno (fork do template da semana). Mesmo
 * cartao de 280px do MaterialSidebar da Daily.
 *
 * Fase 60: a Focadu nao guarda mais o token do git (antes ficava em texto puro no banco e aparecia
 * aqui sempre). O aluno gera sob demanda e ve o valor uma unica vez, nesta tela - so fica em state,
 * some ao recarregar. Gerar de novo revoga o anterior no Forgejo, por isso a confirmacao quando ja
 * existe um valendo (`tokenLastEight`).
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
  const [copied, setCopied] = useState(false);
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

  async function handleCopy(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponivel (ex: contexto nao seguro) - sem tratamento especial, so nao copia.
    }
  }

  return (
    <ScrollArea
      className="shrink-0 rounded-2xl border border-stroke bg-surface lg:h-full lg:w-[250px]"
      contentClassName="flex flex-col gap-4 p-5 pr-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Seu repositório</p>
      <a href={submissionUrl} target="_blank" rel="noreferrer" className="break-all text-[13px] text-accent hover:underline">
        {submissionUrl}
      </a>

      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-medium uppercase tracking-[1px] text-secondary">Clonar</p>
        <code className="whitespace-pre-wrap break-all rounded-lg bg-base px-3 py-2 text-xs text-secondary">
          git clone {submissionUrl}
        </code>
      </div>

      {username && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-medium uppercase tracking-[1px] text-secondary">Usuário do git</p>
            <code className="break-all rounded-lg bg-base px-3 py-2 text-xs text-primary">{username}</code>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[1px] text-secondary">Token (use como senha)</p>

            {generated ? (
              <>
                <code className="break-all rounded-lg bg-base px-3 py-2 text-xs text-primary">{generated.accessToken}</code>
                <button
                  type="button"
                  onClick={() => handleCopy(generated.accessToken)}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-base"
                >
                  {copied ? 'COPIADO ✓' : 'COPIAR TOKEN'}
                </button>
                <p className="text-xs text-alert">
                  Copie agora: por segurança a Focadu não guarda o token, ele não aparece de novo depois que você sair desta tela.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-secondary">
                  {currentLastEight ? (
                    <>
                      Token atual termina em <span className="font-mono text-primary">…{currentLastEight}</span>. Perdeu? Gere outro.
                    </>
                  ) : (
                    'Gere um token para enviar (git push) seu código.'
                  )}
                </p>
                {confirming ? (
                  <div className="flex flex-col gap-2 rounded-lg border border-alert/40 p-3">
                    <p className="text-xs text-secondary">O token atual deixa de funcionar. Continuar?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-base disabled:opacity-50"
                      >
                        {generating ? 'GERANDO...' : 'GERAR'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={generating}
                        className="flex-1 rounded-lg border border-stroke px-3 py-2 text-xs font-bold text-secondary"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={currentLastEight ? () => setConfirming(true) : handleGenerate}
                    disabled={generating}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-base disabled:opacity-50"
                  >
                    {generating ? 'GERANDO...' : currentLastEight ? 'GERAR NOVO TOKEN' : 'GERAR TOKEN'}
                  </button>
                )}
              </>
            )}
            {error && <p className="text-xs text-alert">{error}</p>}
          </div>

          <p className="text-xs text-muted">O git vai pedir usuário e senha na hora do push - use o usuário e o token acima.</p>
        </div>
      )}
    </ScrollArea>
  );
}

/**
 * Coluna direita (Fase 59): links de referencia (biblioteca/documentacao) da linguagem escolhida +
 * os comuns a todas, curados manualmente - so vem preenchido com languageStep Chosen.
 */
function ReferencesPanel({ references, languageName }: { references: ProjectReferenceDto[]; languageName: string | null }) {
  return (
    <ScrollArea
      className="h-[240px] shrink-0 rounded-2xl border border-stroke bg-surface"
      contentClassName="flex flex-col gap-4 p-5 pr-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
        Referências{languageName && ` (${languageName})`}
      </p>
      <div className="flex flex-col gap-2">
        {references.map((reference) => (
          <a
            key={reference.id}
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-1 rounded-[10px] border border-transparent bg-surface-alt p-3 hover:border-stroke"
          >
            <span className="text-[13px] font-semibold text-accent">{reference.title}</span>
            <span className="text-xs text-secondary">{reference.documents}</span>
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
