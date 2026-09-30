import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { ActivityType, type ActivityResponseDto, type DailyActivityDto, type DailyStateDto } from '../../api/types';
import { isFirstOfActivityGroup } from '../../lib/activityGroup';
import { useSession } from '../../lib/sessionContext';
import { useIsDesktop } from '../../lib/useIsDesktop';
import { useLab } from '../../lab/labContext';
import { argvFor, displayOutput, errorLine, formatSeconds, runtimeLabel, toPayload, toRecord, type LabRunRecord } from '../../lab/labOutput';
import { MarkdownBlock } from '../activities/MarkdownBlock';
import { SessionFooter, SessionLayout } from '../SessionShell';
import { BlockIntro } from '../session/BlockIntro';
import { FocadaSays } from '../session/FocadaSays';
import { PixelButton, PixelLink } from '../session/PixelButton';
import { CodeEditor, OutputBox } from './codeParts';
import { draftKey, lineCount, readDraft, splitPrompt, writeDraft } from './codeHelpers';
import { HintPanel, LabChip, LabProgressBar, TerminalPanel, type TerminalEntry } from './labParts';

const LANGUAGE_NAME = { python: 'Python', javascript: 'JavaScript', bash: 'Bash' } as const;

/**
 * Passo de codigo COM laboratorio (Fase 87, Figma "Laboratório de código — v2", quadros 01 a 07;
 * secret/rascunhos/laboratorio-de-codigo-na-ponte.md). O aluno escreve e RODA o codigo na propria tela
 * (Pyodide, Worker de JavaScript ou Linux no v86, sempre no navegador dele - ver src/lab/) e a saida que vai
 * pra avaliacao e a do laboratorio, nao mais uma saida colada. A Focada da dica sob demanda (3 por passo, nao
 * conta como tentativa). Enviar so libera depois de rodar o codigo que esta no editor.
 *
 * As etapas "ajuste isto" / "passou" / "solucao" sao as mesmas do passo sem laboratorio (Fase 79).
 * So desktop: no celular o passo mostra o enunciado e o aviso (quadro 07).
 */
export function LabCodeStepActivity({
  dailyId,
  daily,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  daily: DailyStateDto;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const { weekly } = useSession();
  const { session, snapshot } = useLab();
  const isDesktop = useIsDesktop();
  const lab = daily.lab ?? null;
  const key = draftKey(dailyId, activity.id);

  const responses = activity.responses;
  const lastResponse: ActivityResponseDto | null = responses.at(-1) ?? null;
  const maxAttempts = activity.codeStep?.maxAttempts ?? 3;
  const passed = responses.some((r) => r.passed);
  const exhausted = !passed && responses.length >= maxAttempts;
  const hints = activity.codeStep?.hints ?? [];
  const maxHints = activity.codeStep?.maxHints ?? 3;
  const hintsLeft = Math.max(0, maxHints - hints.length);

  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || responses.length > 0);
  const [editing, setEditing] = useState(lastResponse === null);
  const [draft] = useState(() => readDraft(key));
  const [code, setCode] = useState(draft?.code ?? lastResponse?.transcript ?? activity.codeStep?.codeStarter ?? '');
  const [lastRun, setLastRun] = useState<LabRunRecord | null>(null);
  /** O codigo que estava no editor quando rodou - enviar exige que seja o mesmo de agora. */
  const [ranCode, setRanCode] = useState<string | null>(null);
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [panel, setPanel] = useState<'output' | 'hint'>('output');
  const [hintLoading, setHintLoading] = useState(false);
  const [showPrior, setShowPrior] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** O que ja foi gravado em /root/<entry> na VM (Linux) - so regrava quando o editor mudou. */
  const syncedScript = useRef<string | null>(null);
  /** A area da saida/dica/terminal: depois de rodar ou pedir a dica a tela rola ate ela. */
  const resultRef = useRef<HTMLDivElement>(null);

  // Sobe o laboratorio do dia assim que a Weekly (com os arquivos) chega - ja na tela de entrada do bloco,
  // pra o download terminar enquanto o aluno le. Nunca no celular (so desktop).
  useEffect(() => {
    if (!isDesktop || !lab || !weekly) return;
    session.ensure(lab, weekly.curatedContents).catch(() => undefined);
  }, [session, lab, weekly, isDesktop]);

  // Rola ate o resultado quando ele chega (rodou, dica nova, terminal com comando novo).
  const runCount = entries.length + (lastRun ? 1 : 0) + hints.length + (panel === 'hint' ? 1 : 0);
  useEffect(() => {
    if (runCount > 0) resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [runCount]);

  if (!lab) return null;

  const languageName = LANGUAGE_NAME[lab.runtime];
  const isBash = lab.runtime === 'bash';
  const indent = lab.runtime === 'python' ? '    ' : '  ';
  const codeSteps = daily.activities.filter((a) => a.type === ActivityType.CodeStep).sort((a, b) => a.orderIndex - b.orderIndex);
  const stepNumber = codeSteps.findIndex((a) => a.id === activity.id) + 1;
  const priorCode = activity.codeStep?.priorCode ?? '';
  const priorLines = priorCode ? lineCount(priorCode) : 0;
  const startLine = priorLines > 0 ? priorLines + 2 : 1; // + a linha em branco que separa os passos
  const { title, detail } = splitPrompt(activity.prompt);

  /** O script inteiro: os passos anteriores + o que o aluno escreveu aqui (a numeracao do editor e a dele). */
  const composeScript = (stepCode: string) => `${priorCode ? `${priorCode}\n\n` : ''}${stepCode.replace(/\n+$/, '')}\n`;

  const ready = snapshot.status === 'ready';
  const loading = snapshot.status === 'loading' || snapshot.status === 'idle';
  const running = snapshot.status === 'running';
  const freshRun = lastRun !== null && ranCode === code ? lastRun : null;
  const failedLine = freshRun ? errorLine(freshRun.output, freshRun.exitCode) : null;
  const canSubmit = Boolean(code.trim()) && freshRun !== null && ready && !submitting;

  function update(nextCode: string) {
    setCode(nextCode);
    writeDraft(key, { code: nextCode, output: '' });
  }

  function failure(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback);
  }

  async function handleRun() {
    if (!lab || isBash || !code.trim() || !ready) return;
    setError(null);
    setPanel('output');
    try {
      const result = await session.run(composeScript(code), argvFor(lab.runtime, lab.command), lab.entry);
      setLastRun(toRecord(result));
      setRanCode(code);
    } catch (err) {
      failure(err, 'O laboratório não conseguiu rodar o código.');
    }
  }

  async function handleCommand(command: string) {
    if (!lab || !ready) return;
    setError(null);
    setPanel('output');
    try {
      const script = composeScript(code);
      if (syncedScript.current !== script) {
        await session.write(`${lab.user ? `/home/${lab.user}` : '/root'}/${lab.entry}`, script);
        syncedScript.current = script;
      }
      const result = await session.exec(command);
      // Timeout/parar derrubam a VM: ela sobe limpa e o proximo comando regrava o arquivo.
      if (result.timedOut || result.aborted) syncedScript.current = null;
      const record = toRecord(result);
      const entry: TerminalEntry = { command, output: displayOutput(record, lab.timeoutSeconds), exitCode: result.exitCode };
      const next = [...entries, entry];
      setEntries(next);
      setLastRun({ ...record, output: entry.output, commands: next });
      setRanCode(code);
    } catch (err) {
      failure(err, 'O terminal do laboratório não respondeu.');
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !freshRun) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitCodeStepResponse(dailyId, activity.id, code, '', toPayload(freshRun));
      onDailyRefetched(await api.getDaily(dailyId));
      writeDraft(key, null);
      setEditing(false);
      setLastRun(null);
      setRanCode(null);
      setEntries([]);
    } catch (err) {
      failure(err, 'Não foi possível enviar o passo. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHint() {
    if (!code.trim() || hintsLeft <= 0 || hintLoading) return;
    setHintLoading(true);
    setError(null);
    try {
      await api.requestCodeStepHint(dailyId, activity.id, code, lastRun ? toPayload(lastRun) : undefined);
      onDailyRefetched(await api.getDaily(dailyId));
      setPanel('hint');
    } catch (err) {
      failure(err, 'Não consegui pedir a dica agora. Tente de novo.');
    } finally {
      setHintLoading(false);
    }
  }

  function retryLab() {
    if (!lab || !weekly) return;
    session.reset();
    session.ensure(lab, weekly.curatedContents).catch(() => undefined);
  }

  if (!started) return <BlockIntro activity={activity} onStart={() => setStarted(true)} />;

  const view = passed ? 'passou' : exhausted ? 'solucao' : editing ? 'escrevendo' : 'ajuste';
  const attemptLabel = passed
    ? `Passou na tentativa ${responses.findIndex((r) => r.passed) + 1}`
    : exhausted
      ? `Solução do passo ${stepNumber}`
      : `Tentativa ${Math.min(responses.length + (view === 'escrevendo' ? 1 : 0), maxAttempts)} de ${maxAttempts}`;

  const prior = priorLines > 0 && view !== 'solucao' && (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setShowPrior((v) => !v)}
        aria-expanded={showPrior}
        className="flex items-center gap-2 border-2 border-b-0 border-stroke bg-surface-alt px-3.5 py-1.5 text-left font-pixel-label text-[8px] text-secondary hover:text-primary"
      >
        {showPrior ? '▾' : '▸'} Linhas 1–{priorLines} · {stepNumber === 2 ? 'passo 1' : `passos 1 a ${stepNumber - 1}`} (aprovados)
      </button>
      {showPrior && <CodeEditor value={priorCode} label="Código dos passos anteriores" />}
    </div>
  );

  // ---- celular: so o enunciado e o aviso (Figma, quadro 07) ----
  if (!isDesktop && view === 'escrevendo') {
    return (
      <SessionLayout sub={attemptLabel}>
        <p className="font-sans text-lg font-semibold leading-snug text-primary">{title}</p>
        {showDetail && detail && (
          <div className="[&_p]:text-sm [&_p]:text-secondary">
            <MarkdownBlock text={detail} />
          </div>
        )}
        <section className="flex flex-col gap-3 border-2 border-accent bg-base px-4 py-5" data-testid="lab-celular">
          <p className="font-pixel-label text-[8px] text-accent">// Laboratório de código</p>
          <p className="font-pixel text-3xl leading-none text-primary">Continue no computador</p>
          <p className="font-sans text-sm text-secondary">
            Escrever e rodar código precisa de teclado e de mais memória do que o celular costuma ter. Daqui você lê o enunciado e o material do dia.
          </p>
        </section>
        <div className="flex flex-col gap-3">
          {detail && (
            <PixelButton ghost onClick={() => setShowDetail((v) => !v)}>
              {showDetail ? 'Esconder o enunciado' : 'Ver o enunciado'}
            </PixelButton>
          )}
          {weekly && (
            <PixelLink to={`/start?course=${weekly.courseId}`} ghost tone="muted">
              Voltar pra trilha
            </PixelLink>
          )}
        </div>
      </SessionLayout>
    );
  }

  const shownRun = freshRun ?? lastRun;
  const outputText = shownRun ? displayOutput(shownRun, lab.timeoutSeconds) : '';
  const outputLabel = loading
    ? 'Preparando o laboratório · só na 1ª vez'
    : failedLine !== null
      ? `Saída do laboratório · erro na linha ${failedLine}`
      : freshRun
        ? `Saída do laboratório · ${formatSeconds(freshRun.ms)}`
        : 'Saída do laboratório';
  const hasError = freshRun !== null && freshRun.exitCode !== 0;

  return (
    <SessionLayout sub={attemptLabel}>
      <div className="flex flex-col gap-1.5">
        <p className="font-sans text-lg font-semibold leading-snug text-primary">{view === 'solucao' ? `Solução de referência do passo ${stepNumber}` : title}</p>
        {view === 'escrevendo' && detail && (
          <div className="[&_p]:text-sm [&_p]:text-secondary">
            <MarkdownBlock text={detail} />
          </div>
        )}
      </div>

      {view === 'solucao' ? (
        <>
          <p className="font-pixel-label text-[9px] text-accent">Solução de referência · {languageName}</p>
          <CodeEditor value={activity.codeStep?.solution ?? ''} startLine={startLine} tone="accent" label="Solução de referência" />
          <p className="font-pixel-label text-[9px] text-accent">Saída esperada</p>
          <OutputBox value={activity.codeStep?.expectedOutput ?? ''} />
          {lastResponse && (
            <details className="border-2 border-stroke px-3.5 py-2.5">
              <summary className="cursor-pointer font-pixel-label text-[9px] text-secondary">Seu último envio</summary>
              <div className="mt-3">
                <CodeEditor value={lastResponse.transcript ?? ''} startLine={startLine} label="Seu último envio" />
              </div>
            </details>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="font-pixel-label text-[9px] text-accent">
              Seu código · {lab.entry}
              {view !== 'escrevendo' && <span className="text-secondary"> · {view === 'passou' ? 'aprovado' : 'edite e reenvie'}</span>}
            </p>
            {view === 'escrevendo' && <LabChip label={runtimeLabel(lab)} snapshot={snapshot} />}
          </div>
          <div className="flex flex-col">
            {prior}
            <CodeEditor
              value={view === 'escrevendo' ? code : (lastResponse?.transcript ?? '')}
              onChange={view === 'escrevendo' ? update : undefined}
              startLine={startLine}
              tone={view === 'passou' ? 'accent' : view === 'ajuste' ? 'project' : 'stroke'}
              indent={indent}
              placeholder={`${lab.runtime === 'python' || isBash ? '#' : '//'} passo ${stepNumber}: escreva aqui`}
              onSubmitShortcut={isBash ? undefined : handleRun}
              label={`Seu código do passo ${stepNumber}`}
              errorLine={view === 'escrevendo' ? failedLine : null}
              minLines={6}
            />
          </div>

          <div ref={resultRef} className="flex flex-col gap-3">
            {view !== 'escrevendo' ? (
              <>
                <p className="font-pixel-label text-[9px] text-accent">Saída do laboratório</p>
                <OutputBox value={lastResponse?.justification ?? ''} />
              </>
            ) : panel === 'hint' && hints.length > 0 ? (
              <HintPanel hint={hints[hints.length - 1]} max={maxHints} onClose={() => setPanel('output')} />
            ) : isBash ? (
              snapshot.status === 'error' ? (
                <LabError message={snapshot.error} onRetry={retryLab} />
              ) : loading ? (
                <OutputBox value="">
                  <LabProgressBar snapshot={snapshot} />
                </OutputBox>
              ) : (
                <TerminalPanel
                  entries={entries}
                  onRun={handleCommand}
                  busy={running}
                  disabled={!ready}
                  serviceLabel={lab.services[0] ? `${lab.services[0]} rodando` : null}
                  placeholder={`digite um comando (ex.: ${lab.command})`}
                  prompt={lab.user ? `${lab.user}@srv:~$` : undefined}
                />
              )
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className={`font-pixel-label text-[9px] ${hasError ? 'text-project' : 'text-accent'}`}>{outputLabel}</p>
                  {running ? (
                    <PixelButton ghost className="px-4 py-2 text-[9px]" onClick={() => void session.abort()}>
                      Parar
                    </PixelButton>
                  ) : (
                    <PixelButton ghost className="px-4 py-2 text-[9px]" onClick={handleRun} disabled={!ready || !code.trim()}>
                      {loading ? 'Aguarde' : 'Rodar ›'}
                    </PixelButton>
                  )}
                </div>
                {snapshot.status === 'error' ? (
                  <LabError message={snapshot.error} onRetry={retryLab} />
                ) : (
                  <OutputBox value={loading ? '' : outputText} tone={hasError ? 'project' : 'stroke'}>
                    {loading ? <LabProgressBar snapshot={snapshot} /> : !outputText && <span className="text-muted">Nada rodou ainda. Clique em Rodar para ver a saída.</span>}
                    {running && !loading && <span className="text-project">▲ rodando…</span>}
                  </OutputBox>
                )}
              </>
            )}
          </div>
        </>
      )}

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      <SessionFooter>
        {view === 'escrevendo' ? (
          <>
            <p className="font-pixel-label text-[8px] text-muted">
              {freshRun ? (isBash ? 'Enter roda o comando' : 'Ctrl+Enter roda') : lastRun ? 'Rode de novo pra enviar: o código mudou' : 'Rode o código pra poder enviar'}
            </p>
            <div className="flex items-center gap-3">
              <PixelButton tone="project" ghost onClick={handleHint} disabled={!code.trim() || hintsLeft <= 0 || hintLoading}>
                {hintLoading ? 'Pensando...' : hintsLeft > 0 ? `Dica · ${hintsLeft} ${hintsLeft === 1 ? 'restante' : 'restantes'}` : 'Sem dicas'}
              </PixelButton>
              <PixelButton onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? 'Conferindo...' : 'Enviar passo ›'}
              </PixelButton>
            </div>
          </>
        ) : (
          <>
            <FocadaSays
              size="xs"
              expression={view === 'passou' ? 'comemorando' : 'acolhedora'}
              tone={view === 'passou' ? 'accent' : 'project'}
              label={
                view === 'passou'
                  ? 'Focada · Passou'
                  : view === 'solucao'
                    ? `Focada · ${maxAttempts} de ${maxAttempts}`
                    : `Focada · Ajuste isto · tentativa ${responses.length} de ${maxAttempts}`
              }
              className="min-w-0 flex-1"
            >
              {view === 'solucao' ? (
                <>
                  {lastResponse?.aiFeedback} Leia a solução linha a linha antes de seguir: o próximo passo parte dela.
                </>
              ) : (
                lastResponse?.aiFeedback
              )}
            </FocadaSays>
            {view === 'ajuste' ? (
              <PixelButton
                onClick={() => {
                  update(lastResponse?.transcript ?? code);
                  setLastRun(null);
                  setRanCode(null);
                  setEntries([]);
                  setPanel('output');
                  setEditing(true);
                }}
              >
                Editar ›
              </PixelButton>
            ) : (
              <PixelButton onClick={onContinue}>{view === 'passou' ? (stepNumber < codeSteps.length ? 'Próximo passo ›' : 'Continuar ›') : 'Seguir ›'}</PixelButton>
            )}
          </>
        )}
      </SessionFooter>
    </SessionLayout>
  );
}

/** O laboratorio nao subiu (navegador sem suporte, arquivo que nao baixou): diz o motivo e deixa tentar de novo. */
export function LabError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 border-2 border-alert bg-base px-3.5 py-3" role="alert" data-testid="lab-erro">
      <p className="font-pixel text-lg leading-tight text-alert">O laboratório não conseguiu iniciar.</p>
      {message && <p className="font-mono text-xs leading-[18px] text-secondary">{message}</p>}
      <PixelButton ghost tone="alert" className="px-4 py-2 text-[9px]" onClick={onRetry}>
        Tentar de novo
      </PixelButton>
    </div>
  );
}
