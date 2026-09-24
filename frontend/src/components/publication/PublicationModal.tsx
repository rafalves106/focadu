import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import {
  PublicationPlatform,
  PublicationStatus,
  type CertificationCoverageDto,
  type CourseDetailDto,
  type GitHubRepoDto,
  type ModulePublicationDto,
} from '../../api/types';
import { classifyApiError, type ApiFailure } from '../../lib/apiError';
import shieldIcon from '../../assets/pixel/escudo.png';
import { PixelModal, pixelField } from '../PixelModal';
import { SegmentedBar } from '../SegmentedBar';
import { FocadaSays } from '../session/FocadaSays';
import { PixelButton, PixelChip } from '../session/PixelButton';

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
 *
 * Pixel art desde 24/09/2026 (pedido do dono, todos os modais): casca `PixelModal`, a Focada comemora
 * a abertura e o sucesso e acolhe o erro, botoes `PixelButton`, progresso em `SegmentedBar`. Os emojis
 * 💼/🐙 sairam (sem sprite ainda) - as opcoes dizem a plataforma num rotulo em Silkscreen.
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
  // Fase 45: certificacoes de mercado do Monthly ao qual esta Weekly pertence - reforco mostrado no SuccessStep.
  const currentMonthly = course?.monthlies.find((m) => m.weeklies.some((w) => w.id === weeklyId));

  return (
    <PixelModal label="Compartilhe seu aprendizado" title="Prova pública" onClose={onClose}>
        {networkError && (
          <div className="flex flex-col items-start gap-3 border-2 border-alert p-4">
            <p className="font-pixel text-lg leading-snug text-alert">{networkError.message}</p>
            <PixelButton ghost tone="muted" onClick={() => setNetworkError(null)}>
              Fechar aviso
            </PixelButton>
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
            moduleCertifications={currentMonthly?.certifications ?? []}
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
    </PixelModal>
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
  const option = 'flex flex-1 flex-col items-start gap-2 border-2 bg-surface p-4 text-left transition hover:brightness-110 disabled:opacity-50';
  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Compartilhe seu aprendizado</StepTitle>
      <FocadaSays expression="comemorando">
        Módulo fechado, agente! Agora mostra pro mundo: publicar o que você aprendeu é a prova pública da sua evolução.
      </FocadaSays>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button type="button" disabled={busy} onClick={onLinkedIn} className={`${option} border-accent`}>
          <span className="font-pixel-label text-[10px] text-accent">LinkedIn</span>
          <span className="font-pixel text-xl leading-tight text-primary">Compartilhar um post</span>
        </button>
        <button type="button" disabled={busy} onClick={onGitHub} className={`${option} border-stroke hover:border-secondary`}>
          <span className="font-pixel-label text-[10px] text-secondary">GitHub</span>
          <span className="font-pixel text-xl leading-tight text-primary">Criar um repositório</span>
        </button>
      </div>

      {busy && <LoadingBlocks label="Carregando..." />}

      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel-label text-[9px] text-muted">Seu conhecimento é seu melhor currículo.</p>
        <PixelButton ghost tone="muted" onClick={onCancel}>
          Cancelar
        </PixelButton>
      </div>
    </div>
  );
}

/** Titulo do passo, em VT323 grande (mesmo das telas pixel art). */
function StepTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-pixel text-3xl leading-none text-primary">{children}</h1>;
}

/** Tres blocos piscando (mesmo carregando do TimeoutError). */
function LoadingBlocks({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="status">
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-3 animate-pulse bg-accent" style={{ animationDelay: `${i * 200}ms` }} />
        ))}
      </div>
      <p className="font-pixel text-lg leading-none text-secondary">{label}</p>
    </div>
  );
}

/** Caixa de texto de apoio (rotulo em Silkscreen + corpo em VT323). */
function InfoBox({ label, tone = 'muted', children }: { label: string; tone?: 'muted' | 'alert'; children: ReactNode }) {
  return (
    <div className={`flex w-full flex-col gap-1.5 border-2 p-4 text-left ${tone === 'alert' ? 'border-alert' : 'border-stroke bg-surface'}`}>
      <p className={`font-pixel-label text-[9px] ${tone === 'alert' ? 'text-alert' : 'text-muted'}`}>{label}</p>
      <div className="font-pixel text-lg leading-snug text-primary">{children}</div>
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
      <div className="flex items-center justify-between gap-3">
        <StepTitle>Rascunho do post</StepTitle>
        <PixelChip tone="accent">Auto-gen</PixelChip>
      </div>

      <div className="whitespace-pre-wrap border-2 border-stroke bg-surface p-4 font-pixel text-lg leading-snug text-primary">{draftText}</div>

      <div className="flex flex-col gap-3">
        <div className="flex w-full gap-3">
          <PixelButton ghost tone="muted" onClick={onEdit} className="flex-1">
            Editar
          </PixelButton>
          <PixelButton onClick={onCopyAndPublish} className="flex-1">
            Copiar e publicar
          </PixelButton>
        </div>
        <button type="button" onClick={onWriteOwn} className="self-center font-pixel text-lg text-secondary underline hover:text-primary">
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
      <StepTitle>Editar rascunho</StepTitle>
      <textarea value={draftText} onChange={(e) => onChange(e.target.value)} rows={10} aria-label="Texto do post" className={`${pixelField} resize-none`} />
      <p className={`text-right font-pixel text-lg leading-none ${overLimit ? 'text-alert' : 'text-secondary'}`}>
        {draftText.length} / {LINKEDIN_MAX_CHARS}
      </p>
      <PixelButton disabled={!draftText.trim() || overLimit} onClick={onCopyAndPublish} className="w-full">
        Copiar e publicar
      </PixelButton>
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
      <StepTitle>Onde quer publicar?</StepTitle>

      <div className="flex flex-col gap-2">
        {repos.length === 0 && <p className="font-pixel text-lg text-secondary">Nenhum repositório público encontrado.</p>}
        {repos.map((repo) => {
          const selected = !creatingNewRepo && selectedRepo === repo.name;
          return (
            <button
              key={repo.fullName}
              type="button"
              onClick={() => onSelectRepo(repo.name)}
              aria-pressed={selected}
              className={`flex items-center justify-between gap-3 border-2 p-3 text-left ${
                selected ? 'border-accent bg-accent/10' : 'border-stroke bg-surface hover:border-secondary'
              }`}
            >
              <span className="min-w-0 truncate font-pixel text-xl leading-none text-primary">{repo.fullName}</span>
              <PixelChip tone="accent">Public</PixelChip>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 font-pixel-label text-[9px] text-muted">
        <div className="h-0.5 flex-1 bg-stroke" />
        ou
        <div className="h-0.5 flex-1 bg-stroke" />
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-pixel-label text-[9px] text-secondary">Criar novo repositório</span>
        <input
          value={newRepoName}
          onChange={(e) => onNewRepoNameChange(e.target.value)}
          className={`${pixelField} ${creatingNewRepo ? 'border-accent' : ''}`}
        />
      </label>

      <InfoBox label="O que acontece">Vou criar um commit com o resumo do que você aprendeu neste módulo.</InfoBox>

      <div className="flex items-center justify-between">
        <PixelButton ghost tone="muted" onClick={onBack}>
          ‹ Voltar
        </PixelButton>
        <PixelButton disabled={!canContinue || busy} onClick={onContinue}>
          Continuar ›
        </PixelButton>
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
      <StepTitle>Cole o link do seu post</StepTitle>
      <p className="font-pixel text-lg leading-snug text-secondary">
        Publique o post no LinkedIn e volte aqui para colar o link - é assim que confirmamos a publicação.
      </p>
      <input
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://www.linkedin.com/posts/..."
        aria-label="Link do post"
        className={pixelField}
      />
      <div className="flex items-center justify-between">
        <PixelButton ghost tone="muted" onClick={onBack}>
          ‹ Voltar
        </PixelButton>
        <PixelButton disabled={!url.trim() || busy} onClick={onSubmit}>
          Validar ›
        </PixelButton>
      </div>
    </div>
  );
}

function ValidatingStep() {
  return (
    <div className="flex justify-center py-6">
      <LoadingBlocks label="Validando publicação..." />
    </div>
  );
}

function SuccessStep({
  publication,
  courseProgress,
  nextWeeklyId,
  courseId,
  moduleCertifications,
  onGoToNext,
  onClose,
}: {
  publication: ModulePublicationDto;
  courseProgress: number | null;
  nextWeeklyId: string | null;
  courseId: string | null;
  moduleCertifications: CertificationCoverageDto[];
  onGoToNext: (url: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-2">
        <PixelChip tone="accent">Sistema // validado</PixelChip>
        <StepTitle>Publicado com sucesso!</StepTitle>
      </div>

      <FocadaSays expression="comemorando" tone="accent">
        Seu aprendizado está visível, agente.{nextWeeklyId ? ' Próximo módulo desbloqueado!' : ''}
      </FocadaSays>

      {publication.submittedUrl && (
        <InfoBox label="Link da publicação confirmada">
          <a href={publication.submittedUrl} target="_blank" rel="noreferrer" className="block truncate text-accent hover:underline">
            {publication.submittedUrl}
          </a>
        </InfoBox>
      )}

      {moduleCertifications.length > 0 && (
        <InfoBox label="Você avançou em direção a">
          <div className="mt-1 flex flex-wrap gap-2">
            {moduleCertifications.map((cert) => (
              <span key={cert.certificationCode} className="inline-flex items-center gap-1.5">
                <img src={shieldIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
                <PixelChip tone="accent">{cert.certificationName}</PixelChip>
              </span>
            ))}
          </div>
        </InfoBox>
      )}

      {courseProgress !== null && (
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-pixel-label text-[9px] text-secondary">Conclusão da trilha</span>
            <span className="font-pixel text-xl leading-none text-accent">{courseProgress}%</span>
          </div>
          <SegmentedBar percentage={courseProgress} label="Conclusão da trilha" />
        </div>
      )}

      <div className="flex w-full gap-3">
        {publication.submittedUrl && (
          <a
            href={publication.submittedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center border-2 border-secondary px-5 py-3 font-pixel-label text-[11px] leading-none text-secondary hover:text-primary"
          >
            Ver publicação
          </a>
        )}
        {nextWeeklyId ? (
          <PixelButton onClick={() => onGoToNext(`/start?course=${courseId ?? ''}&weekly=${nextWeeklyId}`)} className="flex-1">
            Próximo módulo ›
          </PixelButton>
        ) : (
          <PixelButton onClick={onClose} className="flex-1">
            Fechar
          </PixelButton>
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-2">
        <PixelChip tone="alert">Processo // erro</PixelChip>
        <StepTitle>Erro na validação</StepTitle>
      </div>

      <FocadaSays expression="acolhedora" tone="alert">
        Não consegui confirmar a publicação, agente. Dá uma olhada no detalhe e tenta de novo.
      </FocadaSays>

      <InfoBox label="Detalhes da ocorrência" tone="alert">
        {publication.validationError}
      </InfoBox>

      <InfoBox label="Solução recomendada">{suggestion}</InfoBox>

      <div className="flex w-full gap-3">
        <PixelButton ghost tone="muted" onClick={onEditAgain} className="flex-1">
          ‹ Voltar e editar
        </PixelButton>
        <PixelButton tone="alert" onClick={onRetry} className="flex-1">
          Tentar novamente
        </PixelButton>
      </div>
    </div>
  );
}
