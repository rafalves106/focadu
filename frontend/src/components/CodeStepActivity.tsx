import { useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { api, ApiError } from '../api/client';
import { ActivityType, ProjectLanguage, type ActivityResponseDto, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { isFirstOfActivityGroup } from '../lib/activityGroup';
import { useSession } from '../lib/sessionContext';
import { MarkdownBlock } from './activities/MarkdownBlock';
import { SessionFooter, SessionLayout } from './SessionShell';
import { BlockIntro } from './session/BlockIntro';
import { FocadaSays } from './session/FocadaSays';
import { PixelButton } from './session/PixelButton';

/** Rascunho do passo no navegador - recarregar a pagina nao perde o que o aluno digitou. */
function draftKey(dailyId: string, activityId: string) {
  return `focadu:passo-codigo:${dailyId}:${activityId}`;
}

function readDraft(key: string): { code: string; output: string } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { code: string; output: string }) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: { code: string; output: string } | null) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  } catch {
    // Sem storage (aba anonima, bloqueado): o rascunho so nao sobrevive a um recarregar.
  }
}

function lineCount(text: string) {
  return text === '' ? 1 : text.replace(/\n$/, '').split('\n').length;
}

/** "**Titulo**\n\ndetalhe" (curadoria) -> titulo em destaque + o resto como Markdown. */
function splitPrompt(prompt: string | null): { title: string; detail: string } {
  const [first, ...rest] = (prompt ?? '').split(/\n\s*\n/);
  return { title: first.replace(/^\*\*|\*\*$/g, '').trim(), detail: rest.join('\n\n').trim() };
}

const TONE_BORDER = { stroke: 'border-stroke', accent: 'border-accent', project: 'border-project' } as const;

/**
 * Editor do passo (Fase 79, Figma "Ponte: code comigo"): numeros de linha continuando do script dos
 * passos anteriores, Fira Code, sem quebra de linha, Tab indenta. Cresce com o conteudo - quem rola e
 * o cartao da sessao, entao a numeracao nunca desalinha.
 */
function CodeEditor({
  value,
  onChange,
  startLine = 1,
  tone = 'stroke',
  indent = '    ',
  placeholder,
  onSubmitShortcut,
  label,
}: {
  value: string;
  onChange?: (value: string) => void;
  startLine?: number;
  tone?: keyof typeof TONE_BORDER;
  indent?: string;
  placeholder?: string;
  onSubmitShortcut?: () => void;
  label: string;
}) {
  const lines = Math.max(lineCount(value), onChange ? 8 : 1);
  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmitShortcut?.();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && onChange) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart, selectionEnd } = el;
      onChange(value.slice(0, selectionStart) + indent + value.slice(selectionEnd));
      requestAnimationFrame(() => el.setSelectionRange(selectionStart + indent.length, selectionStart + indent.length));
    }
  }

  return (
    <div className={`flex overflow-x-auto border-2 bg-surface px-3.5 py-2.5 ${TONE_BORDER[tone]}`}>
      <pre aria-hidden="true" className="shrink-0 select-none pr-3.5 text-right font-mono text-[13px] leading-5 text-muted">
        {Array.from({ length: lines }, (_, i) => startLine + i).join('\n')}
      </pre>
      {onChange ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={lines}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label={label}
          placeholder={placeholder}
          className="min-w-0 flex-1 resize-none overflow-hidden whitespace-pre bg-transparent font-mono text-[13px] leading-5 text-primary outline-none placeholder:text-muted"
        />
      ) : (
        <pre aria-label={label} className="min-w-0 flex-1 whitespace-pre font-mono text-[13px] leading-5 text-primary">
          {value}
        </pre>
      )}
    </div>
  );
}

function OutputBox({ value, onChange, onSubmitShortcut, placeholder }: { value: string; onChange?: (value: string) => void; onSubmitShortcut?: () => void; placeholder?: string }) {
  const className = 'w-full border-2 border-stroke bg-base px-3.5 py-2.5 font-mono text-xs leading-[18px] text-secondary outline-none focus:border-accent';
  if (!onChange) return <pre className={`${className} overflow-x-auto whitespace-pre`}>{value}</pre>;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          onSubmitShortcut?.();
        }
      }}
      rows={Math.max(3, lineCount(value))}
      wrap="off"
      spellCheck={false}
      aria-label="Saída do seu terminal"
      placeholder={placeholder}
      className={`${className} resize-none overflow-hidden whitespace-pre placeholder:text-muted`}
    />
  );
}

/**
 * Passo de codigo da ponte (Fase 79, "code comigo" - secret/rascunhos/ponte-code-comigo.md; Figma
 * "Ponte: code comigo — v2", telas 01 a 04). O aluno escreve so o que o passo acrescenta ao script,
 * roda na maquina dele contra o arquivo do dia e manda o codigo + a saida; a IA confere os dois.
 *
 * - escrevendo: o script dos passos anteriores fica dobrado no topo do editor (so leitura);
 * - "ajuste isto": a Focada em ambar com a dica; "Editar" volta pro editor com o ultimo envio;
 * - passou: a Focada em verde e "Proximo passo";
 * - na ultima tentativa sem passar: a solucao de referencia e a saida esperada, e o passo seguinte
 *   parte dela (o backend monta o script anterior - `codeStep.priorCode`).
 *
 * Ajustar nunca e erro da sessao (o conta-giros vira "Tentativas do passo", ver SessionShell).
 */
export function CodeStepActivity({
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
  const key = draftKey(dailyId, activity.id);
  const responses = activity.responses;
  const lastResponse: ActivityResponseDto | null = responses.at(-1) ?? null;
  const maxAttempts = activity.codeStep?.maxAttempts ?? 3;
  const passed = responses.some((r) => r.passed);
  const exhausted = !passed && responses.length >= maxAttempts;

  const [started, setStarted] = useState(!isFirstOfActivityGroup(daily, activity) || responses.length > 0);
  const [editing, setEditing] = useState(lastResponse === null);
  const [draft] = useState(() => readDraft(key));
  const [code, setCode] = useState(draft?.code ?? lastResponse?.transcript ?? '');
  const [output, setOutput] = useState(draft?.output ?? lastResponse?.justification ?? '');
  const [showPrior, setShowPrior] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJs = weekly?.project?.language === ProjectLanguage.JavaScript;
  const languageName = isJs ? 'JavaScript' : 'Python';
  const indent = isJs ? '  ' : '    ';
  const codeSteps = daily.activities.filter((a) => a.type === ActivityType.CodeStep).sort((a, b) => a.orderIndex - b.orderIndex);
  const stepNumber = codeSteps.findIndex((a) => a.id === activity.id) + 1;
  const priorCode = activity.codeStep?.priorCode ?? '';
  const priorLines = priorCode ? lineCount(priorCode) : 0;
  const startLine = priorLines > 0 ? priorLines + 2 : 1; // + a linha em branco que separa os passos
  const { title, detail } = splitPrompt(activity.prompt);

  function update(nextCode: string, nextOutput: string) {
    setCode(nextCode);
    setOutput(nextOutput);
    writeDraft(key, { code: nextCode, output: nextOutput });
  }

  async function handleSubmit() {
    if (!code.trim() || !output.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitCodeStepResponse(dailyId, activity.id, code, output);
      onDailyRefetched(await api.getDaily(dailyId));
      writeDraft(key, null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o passo. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
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
            <p className="font-pixel-label text-[9px] text-accent">Seu código · {languageName}</p>
            <p className="font-pixel-label text-[8px] text-secondary">
              {view === 'escrevendo' ? (priorLines > 0 ? 'Só o que este passo acrescenta' : 'Primeiro passo do script') : view === 'passou' ? 'Aprovado' : 'Edite e reenvie'}
            </p>
          </div>
          <div className="flex flex-col">
            {prior}
            <CodeEditor
              value={view === 'escrevendo' ? code : (lastResponse?.transcript ?? '')}
              onChange={view === 'escrevendo' ? (next) => update(next, output) : undefined}
              startLine={startLine}
              tone={view === 'passou' ? 'accent' : view === 'ajuste' ? 'project' : 'stroke'}
              indent={indent}
              placeholder={`${isJs ? '//' : '#'} passo ${stepNumber}: escreva aqui`}
              onSubmitShortcut={handleSubmit}
              label={`Seu código do passo ${stepNumber}`}
            />
          </div>
          <p className="font-pixel-label text-[9px] text-accent">Saída do seu terminal{view === 'escrevendo' ? ' · cole o que apareceu' : ''}</p>
          <OutputBox
            value={view === 'escrevendo' ? output : (lastResponse?.justification ?? '')}
            onChange={view === 'escrevendo' ? (next) => update(code, next) : undefined}
            onSubmitShortcut={handleSubmit}
            placeholder="cole aqui o que o terminal mostrou"
          />
        </>
      )}

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      <SessionFooter>
        {view === 'escrevendo' ? (
          <>
            <p className="font-pixel-label text-[8px] text-muted">Ctrl+Enter envia · a Focada lê o código e a saída</p>
            <PixelButton onClick={handleSubmit} disabled={!code.trim() || !output.trim() || submitting}>
              {submitting ? 'Conferindo...' : 'Enviar passo ›'}
            </PixelButton>
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
                  update(lastResponse?.transcript ?? code, lastResponse?.justification ?? output);
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
