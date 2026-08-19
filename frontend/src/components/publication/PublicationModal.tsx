import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { PublicationPlatform, PublicationStatus, type CourseDetailDto, type GitHubRepoDto, type ModulePublicationDto } from '../../api/types';
import { classifyApiError, type ApiFailure } from '../../lib/apiError';

const LINKEDIN_MAX_CHARS = 3000;

type Step =
  | 'intro'
  | 'linkedinDraft'
  | 'linkedinEditor'
  | 'githubSelect'
  | 'urlSubmit'
  | 'validating'
  | 'success'
  | 'error';

/**
 * Modal de publicacao publica (Fase 11, design Figma "Modal de Publicacao") - prova de
 * aprendizado exigida ao completar um modulo (Documento Mestre, Secao 2.3). Maquina de passo
 * local (`step`), mesmo padrao ja usado em TodayPage (Fase 4) - so que aqui vive inteira num
 * unico componente porque o fluxo e uma arvore pequena (nao uma sequencia de N atividades).
 *
 * Erros de rede (fetch falhou, timeout, 5xx) usam `classifyApiError` (Fase 10), mas SEM o
 * `ApiErrorScreen`/`ErrorLayout` de tela cheia - eles pressupoe `min-h-screen`, incompativel com
 * o card do modal; aqui e so um bloco de texto compacto + "Tentar de novo".
 *
 * "Erro na Validacao" (URL invalida/repo privado) e um estado de DOMINIO (ModulePublicationDto.
 * status === Failed), diferente de erro de rede - por isso tem a propria tela (`error` abaixo),
 * separada do tratamento de rede.
 *
 * So `onClose` (sem `onPublished`) de proposito: um `onPublished` chamado no meio do fluxo (antes
 * do usuario ver o SuccessStep) tentaria fazer o chamador atualizar dados da pagina de tras -
 * qualquer `retry()`/refetch ali reseta `loading` no pai, que desmonta este modal (junto com seu
 * `step`) antes do usuario ver a confirmacao. O chamador so precisa re-buscar dados quando o modal
 * de fato fecha (`onClose` cobre "publicou e fechou" e "cancelou" do mesmo jeito, sem diferenca
 * pratica aqui).
 */
export function PublicationModal({
  weeklyId,
  courseId,
  onClose,
}: {
  weeklyId: string;
  courseId: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro');
  const [busy, setBusy] = useState(false);
  const [networkError, setNetworkError] = useState<ApiFailure | null>(null);
  const [publication, setPublication] = useState<ModulePublicationDto | null>(null);
  const [draftText, setDraftText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [repos, setRepos] = useState<GitHubRepoDto[] | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [newRepoName, setNewRepoName] = useState(`websec-modulo-${weeklyId.slice(0, 4)}`);
  const [creatingNewRepo, setCreatingNewRepo] = useState(false);
  const [course, setCourse] = useState<CourseDetailDto | null>(null);

  // So pra "CONTINUAR ESTUDANDO" saber pra onde ir e mostrar um progresso real na tela de sucesso
  // - nao bloqueia o resto do modal se falhar (dado secundario, nao essencial ao fluxo).
  useEffect(() => {
    if (!courseId) return;
    api.getCourse(courseId).then(setCourse).catch(() => {});
  }, [courseId]);

  async function runStep(action: () => Promise<void>) {
    setBusy(true);
    setNetworkError(null);
    try {
      await action();
    } catch (err) {
      setNetworkError(classifyApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStartLinkedIn() {
    await runStep(async () => {
      const result = await api.generateLinkedInDraft(weeklyId);
      setPublication(result);
      setDraftText(result.generatedDraft ?? '');
      setStep('linkedinDraft');
    });
  }

  async function handleStartGitHub() {
    await runStep(async () => {
      const list = await api.getGitHubRepositories();
      setRepos(list);
      setStep('githubSelect');
    });
  }

  function handleCopyAndPublish() {
    void navigator.clipboard.writeText(draftText);
    window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
    setUrlInput('');
    setStep('urlSubmit');
  }

  async function handleGitHubContinue() {
    const repoName = creatingNewRepo ? newRepoName.trim() : selectedRepo;
    if (!repoName) return;

    setStep('validating');
    await runStep(async () => {
      const result = await api.commitToGitHub(weeklyId, repoName, creatingNewRepo);
      setPublication(result);
      if (result.status === PublicationStatus.Validated) {
        setStep('success');
      } else {
        setStep('error');
      }
    });
  }

  async function handleSubmitUrl() {
    if (!urlInput.trim()) return;

    setStep('validating');
    await runStep(async () => {
      const result = await api.submitPublication(weeklyId, PublicationPlatform.LinkedIn, urlInput.trim());
      setPublication(result);
      if (result.status === PublicationStatus.Validated) {
        setStep('success');
      } else {
        setStep('error');
      }
    });
  }

  const allWeeklies = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const currentWeeklyNumber = allWeeklies.find((w) => w.id === weeklyId)?.number;
  const nextWeekly = currentWeeklyNumber ? allWeeklies.find((w) => w.number === currentWeeklyNumber + 1) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-[560px] flex-col gap-6 overflow-y-auto rounded-2xl border border-surface-alt bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Compartilhe seu aprendizado"
      >
        {networkError && (
          <div className="flex flex-col gap-2 rounded-xl border border-alert bg-alert/10 p-4 text-sm">
            <p className="text-alert">{networkError.message}</p>
            <button type="button" onClick={() => setNetworkError(null)} className="w-fit text-secondary hover:text-primary">
              Fechar aviso
            </button>
          </div>
        )}

        {step === 'intro' && (
          <IntroStep busy={busy} onLinkedIn={handleStartLinkedIn} onGitHub={handleStartGitHub} onCancel={onClose} />
        )}

        {step === 'linkedinDraft' && (
          <DraftPreviewStep
            draftText={draftText}
            onEdit={() => setStep('linkedinEditor')}
            onCopyAndPublish={handleCopyAndPublish}
            onWriteOwn={() => {
              setDraftText('');
              setStep('linkedinEditor');
            }}
          />
        )}

        {step === 'linkedinEditor' && (
          <EditorStep draftText={draftText} onChange={setDraftText} onCopyAndPublish={handleCopyAndPublish} />
        )}

        {step === 'githubSelect' && (
          <GitHubSelectStep
            repos={repos ?? []}
            selectedRepo={selectedRepo}
            onSelectRepo={(name) => {
              setSelectedRepo(name);
              setCreatingNewRepo(false);
            }}
            newRepoName={newRepoName}
            creatingNewRepo={creatingNewRepo}
            onNewRepoNameChange={(name) => {
              setNewRepoName(name);
              setCreatingNewRepo(true);
              setSelectedRepo(null);
            }}
            busy={busy}
            onBack={() => setStep('intro')}
            onContinue={handleGitHubContinue}
          />
        )}

        {step === 'urlSubmit' && (
          <UrlSubmitStep
            url={urlInput}
            onChange={setUrlInput}
            busy={busy}
            onBack={() => setStep('linkedinDraft')}
            onSubmit={handleSubmitUrl}
          />
        )}

        {step === 'validating' && <ValidatingStep />}

        {step === 'success' && publication && (
          <SuccessStep
            publication={publication}
            courseProgress={course?.progress.completionPercentage ?? null}
            nextWeeklyId={nextWeekly?.id ?? null}
            courseId={courseId}
            onGoToNext={(url) => navigate(url)}
            onClose={onClose}
          />
        )}

        {step === 'error' && publication && (
          <ErrorStep
            publication={publication}
            onEditAgain={() => setStep(publication.platform === PublicationPlatform.GitHub ? 'githubSelect' : 'urlSubmit')}
            onRetry={() => (publication.platform === PublicationPlatform.GitHub ? handleGitHubContinue() : handleSubmitUrl())}
          />
        )}
      </div>
    </div>
  );
}

function IntroStep({
  busy,
  onLinkedIn,
  onGitHub,
  onCancel,
}: {
  busy: boolean;
  onLinkedIn: () => void;
  onGitHub: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-primary">Compartilhe Seu Aprendizado</h1>
        <p className="text-sm text-secondary">
          Publique o que aprendeu neste módulo - prova pública de evolução, seu conhecimento é seu melhor currículo.
        </p>
      </div>

      <div className="flex w-full gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={onLinkedIn}
          className="flex flex-1 flex-col items-center gap-3 rounded-xl border-[1.5px] border-accent bg-base p-5 disabled:opacity-50"
        >
          <span className="text-2xl" aria-hidden="true">
            💼
          </span>
          <span className="text-sm font-bold text-primary">Compartilhar no LinkedIn</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onGitHub}
          className="flex flex-1 flex-col items-center gap-3 rounded-xl border border-surface-alt bg-base p-5 hover:border-secondary disabled:opacity-50"
        >
          <span className="text-2xl" aria-hidden="true">
            🐙
          </span>
          <span className="text-sm font-semibold text-secondary">Criar repositório no GitHub</span>
        </button>
      </div>

      {busy && <p className="text-xs text-secondary">Carregando...</p>}

      <button type="button" onClick={onCancel} className="text-sm text-secondary underline hover:text-primary">
        Cancelar
      </button>
      <p className="text-[11px] uppercase tracking-wide text-muted">Seu conhecimento é seu melhor currículo.</p>
    </div>
  );
}

function DraftPreviewStep({
  draftText,
  onEdit,
  onCopyAndPublish,
  onWriteOwn,
}: {
  draftText: string;
  onEdit: () => void;
  onCopyAndPublish: () => void;
  onWriteOwn: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-base font-bold text-primary">
          <span aria-hidden="true">💼</span> Preview — Rascunho Gerado
        </h1>
        <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[11px] font-mono text-accent">AUTO-GEN</span>
      </div>

      <div className="whitespace-pre-wrap rounded-lg border border-surface-alt bg-base p-5 text-sm leading-relaxed text-primary">
        {draftText}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex w-full gap-3">
          <button type="button" onClick={onEdit} className="flex-1 rounded border border-surface-alt py-2.5 text-sm font-semibold text-primary">
            Editar
          </button>
          <button type="button" onClick={onCopyAndPublish} className="flex-1 rounded bg-accent py-2.5 text-sm font-bold text-base">
            Copiar e Publicar
          </button>
        </div>
        <button type="button" onClick={onWriteOwn} className="text-xs text-secondary underline hover:text-primary">
          Prefiro criar meu próprio
        </button>
      </div>
    </div>
  );
}

function EditorStep({
  draftText,
  onChange,
  onCopyAndPublish,
}: {
  draftText: string;
  onChange: (text: string) => void;
  onCopyAndPublish: () => void;
}) {
  const overLimit = draftText.length > LINKEDIN_MAX_CHARS;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-base font-bold text-primary">Editar rascunho</h1>
      <textarea
        value={draftText}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="resize-none rounded-lg border border-surface-alt bg-base p-4 text-sm text-primary outline-none focus:border-accent"
      />
      <p className={`text-right text-xs ${overLimit ? 'text-alert' : 'text-secondary'}`}>
        {draftText.length} / {LINKEDIN_MAX_CHARS}
      </p>
      <button
        type="button"
        disabled={!draftText.trim() || overLimit}
        onClick={onCopyAndPublish}
        className="rounded bg-accent py-3 text-sm font-bold text-base disabled:opacity-40"
      >
        Copiar e Publicar
      </button>
    </div>
  );
}

function GitHubSelectStep({
  repos,
  selectedRepo,
  onSelectRepo,
  newRepoName,
  creatingNewRepo,
  onNewRepoNameChange,
  busy,
  onBack,
  onContinue,
}: {
  repos: GitHubRepoDto[];
  selectedRepo: string | null;
  onSelectRepo: (name: string) => void;
  newRepoName: string;
  creatingNewRepo: boolean;
  onNewRepoNameChange: (name: string) => void;
  busy: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const canContinue = creatingNewRepo ? newRepoName.trim().length > 0 : selectedRepo !== null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="flex items-center gap-2 text-base font-bold text-primary">
        <span aria-hidden="true">🐙</span> Onde quer publicar?
      </h1>

      <div className="flex flex-col gap-2">
        {repos.length === 0 && <p className="text-sm text-secondary">Nenhum repositório público encontrado.</p>}
        {repos.map((repo) => (
          <button
            key={repo.fullName}
            type="button"
            onClick={() => onSelectRepo(repo.name)}
            className={`flex items-center justify-between rounded-lg border p-4 text-left ${
              !creatingNewRepo && selectedRepo === repo.name ? 'border-accent bg-accent/10' : 'border-surface-alt bg-base'
            }`}
          >
            <span className="font-mono text-sm text-primary">{repo.fullName}</span>
            <span className="rounded-full border border-accent bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">PUBLIC</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs text-secondary">
        <div className="h-px flex-1 bg-surface-alt" />
        OU
        <div className="h-px flex-1 bg-surface-alt" />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-secondary">Criar novo repositório</span>
        <input
          value={newRepoName}
          onChange={(e) => onNewRepoNameChange(e.target.value)}
          className={`rounded border bg-base p-3 font-mono text-sm text-primary outline-none focus:border-accent ${
            creatingNewRepo ? 'border-accent' : 'border-surface-alt'
          }`}
        />
      </label>

      <p className="rounded bg-surface-alt p-3 text-xs text-secondary">
        Vou criar um commit com o resumo do que você aprendeu neste módulo.
      </p>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-secondary underline hover:text-primary">
          Voltar
        </button>
        <button
          type="button"
          disabled={!canContinue || busy}
          onClick={onContinue}
          className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-base disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

function UrlSubmitStep({
  url,
  onChange,
  busy,
  onBack,
  onSubmit,
}: {
  url: string;
  onChange: (url: string) => void;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-base font-bold text-primary">Cole aqui o link do seu post</h1>
      <p className="text-sm text-secondary">
        Publique o post no LinkedIn e volte aqui para colar o link - é assim que confirmamos a publicação.
      </p>
      <input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://www.linkedin.com/posts/..."
        className="rounded-lg border border-surface-alt bg-base p-3 font-mono text-sm text-primary outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-secondary underline hover:text-primary">
          Voltar
        </button>
        <button
          type="button"
          disabled={!url.trim() || busy}
          onClick={onSubmit}
          className="rounded bg-accent px-5 py-2.5 text-sm font-bold text-base disabled:opacity-40"
        >
          Validar
        </button>
      </div>
    </div>
  );
}

function ValidatingStep() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="size-10 animate-spin rounded-full border-2 border-surface-alt border-t-accent" aria-hidden="true" />
      <p className="text-sm text-secondary">Validando publicação...</p>
    </div>
  );
}

function SuccessStep({
  publication,
  courseProgress,
  nextWeeklyId,
  courseId,
  onGoToNext,
  onClose,
}: {
  publication: ModulePublicationDto;
  courseProgress: number | null;
  nextWeeklyId: string | null;
  courseId: string | null;
  onGoToNext: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-accent bg-accent/10 text-3xl text-accent" aria-hidden="true">
        ✓
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="w-fit self-center rounded bg-accent/20 px-2.5 py-1 text-[11px] font-bold text-accent">SISTEMA // VALIDADO</span>
        <h1 className="text-xl font-extrabold text-primary">Publicado com Sucesso!</h1>
      </div>

      {publication.submittedUrl && (
        <div className="w-full rounded-lg border border-surface-alt bg-base p-4 text-left">
          <p className="text-[11px] font-bold uppercase text-muted">Link da publicação confirmada</p>
          <a
            href={publication.submittedUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-mono text-sm text-accent hover:underline"
          >
            {publication.submittedUrl}
          </a>
        </div>
      )}

      <p className="text-sm text-secondary">
        Seu aprendizado está visível.{nextWeeklyId ? ' Próximo módulo desbloqueado!' : ''}
      </p>

      {courseProgress !== null && (
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-secondary">Conclusão da trilha</span>
            <span className="font-mono font-bold text-accent">{courseProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full rounded-full bg-accent" style={{ width: `${courseProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex w-full gap-3">
        <a
          href={publication.submittedUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded border border-surface-alt py-2.5 text-center text-sm font-semibold text-primary"
        >
          Ver Publicação
        </a>
        {nextWeeklyId ? (
          <button
            type="button"
            onClick={() => onGoToNext(`/start?course=${courseId ?? ''}&weekly=${nextWeeklyId}`)}
            className="flex-1 rounded bg-accent py-2.5 text-sm font-bold text-base"
          >
            Próximo Módulo
          </button>
        ) : (
          <button type="button" onClick={onClose} className="flex-1 rounded bg-accent py-2.5 text-sm font-bold text-base">
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorStep({
  publication,
  onEditAgain,
  onRetry,
}: {
  publication: ModulePublicationDto;
  onEditAgain: () => void;
  onRetry: () => void;
}) {
  const suggestion =
    publication.platform === PublicationPlatform.GitHub
      ? 'Acesse github.com/settings e confirme que o repositório está público.'
      : 'Confirme que colou o link do post já publicado (formato linkedin.com/posts/... ou linkedin.com/feed/update/...).';

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="flex size-16 items-center justify-center rounded-full border-2 border-alert bg-alert/10 text-3xl text-alert" aria-hidden="true">
        ✕
      </span>
      <div className="flex flex-col gap-1.5">
        <span className="w-fit self-center rounded bg-alert/20 px-2.5 py-1 text-[11px] font-bold text-alert">PROCESSO // ERRO</span>
        <h1 className="text-xl font-extrabold text-primary">Erro na Validação</h1>
      </div>

      <div className="w-full rounded-lg border border-alert bg-alert/10 p-4 text-left">
        <p className="text-[11px] font-bold uppercase text-alert">Detalhes da ocorrência</p>
        <p className="mt-1 text-sm text-primary">{publication.validationError}</p>
      </div>

      <div className="w-full rounded-lg border border-surface-alt bg-base p-4 text-left">
        <p className="text-[11px] font-bold uppercase text-muted">Solução recomendada</p>
        <p className="mt-1 text-sm text-secondary">{suggestion}</p>
      </div>

      <div className="flex w-full gap-3">
        <button type="button" onClick={onEditAgain} className="flex-1 rounded border border-surface-alt py-2.5 text-sm font-semibold text-primary">
          Voltar e Editar
        </button>
        <button type="button" onClick={onRetry} className="flex-1 rounded bg-alert py-2.5 text-sm font-bold text-base">
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
