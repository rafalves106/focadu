import { useState } from 'react';
import { api, ApiError } from '../../api/client';
import type { DailyActivityDto, DailyStateDto } from '../../api/types';
import { errorLine, toPayload } from '../../lab/labOutput';
import { bridgePosition, closedBlocksLabel, closedLinesFor, joinCode, lineTotal } from '../../lib/bridgeSteps';
import { fazerKind } from '../../lib/bridgeText';
import { useBridgeRunner, type BridgeRun } from '../../lib/useBridgeRunner';
import { MarkdownBlock } from '../activities/MarkdownBlock';
import { draftKey, readDraft, splitPrompt, writeDraft } from '../code/codeHelpers';
import { BridgeCodeColumn, SessionFooter, SessionLayout } from '../SessionShell';
import { Button } from '../ui/Button';
import { FocadaLine } from '../ui/FocadaLine';
import { BridgeEditor, type LineState } from './BridgeEditor';
import { BridgeTerminal } from './BridgeTerminal';

/** A lacuna continua marcada enquanto a linha está vazia ou ainda tem o "___" do código inicial. */
function isOpenGap(line: string | undefined): boolean {
  return line === undefined || line.trim() === '' || /_{3,}/.test(line);
}

/**
 * Passo de código da ponte intercalada (Fase 113, molde Foco dividido; quadros `110:937`, `110:1271`, `119:3363`,
 * `111:701`, `112:1338`). A coluna do passo tem o pedido, a devolutiva e o Primário; o editor e o terminal vão pra
 * coluna fixa do código (`BridgeCodeColumn`), com o arquivo do dia inteiro e a parte deste passo em Passo.
 *
 * - Fazer com a ajuda diminuindo: lacuna marcada (bloco 1), só a estrutura (bloco 2), sozinho (bloco 3, parte das linhas
 *   ordenadas: passo "refaz");
 * - Corrigir: o bloco com o erro marcado substitui o do Fazer ("refaz") e a conferência da Focada roda de novo com outra
 *   entrada (`codeCheck`), mostrando em vermelho o que saiu diferente;
 * - "Enviar o passo" só libera depois de rodar o código que está no editor; tentativa errada continua no editor, com a
 *   devolutiva da Focada no cartão; na última, a solução aparece e o passo seguinte parte dela.
 */
export function BridgeCodeStep({
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
  const runner = useBridgeRunner();
  const step = activity.codeStep;
  const key = draftKey(dailyId, activity.id);
  const responses = activity.responses;
  const lastResponse = responses.at(-1) ?? null;
  const maxAttempts = step?.maxAttempts ?? 3;
  const passed = responses.some((r) => r.passed);
  const exhausted = !passed && responses.length >= maxAttempts;
  const view: 'escrevendo' | 'passou' | 'solucao' = passed ? 'passou' : exhausted ? 'solucao' : 'escrevendo';
  const hints = step?.hints ?? [];
  const hintsLeft = Math.max(0, (step?.maxHints ?? 0) - hints.length);

  const starter = step?.codeStarter ?? '';
  const [code, setCode] = useState(() => readDraft(key)?.code ?? lastResponse?.transcript ?? starter);
  const [lastRun, setLastRun] = useState<BridgeRun | null>(null);
  const [ranCode, setRanCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const position = bridgePosition(daily, activity.id);
  const isFix = step?.marks?.some((m) => m.kind === 'Erro') ?? false;
  const kind = fazerKind(activity);
  const prior = step?.priorCode ?? '';
  const priorLines = lineTotal(prior);
  const regionStart = priorLines > 0 ? priorLines + 2 : 1;
  const indent = runner.language === 'Python' ? '    ' : '  ';
  const { title, detail } = splitPrompt(activity.prompt);

  const freshRun = lastRun !== null && ranCode === code ? lastRun : null;
  const failedLine = freshRun ? errorLine(freshRun.record.output, freshRun.record.exitCode) : null;
  const canSubmit = view === 'escrevendo' && !!code.trim() && freshRun !== null && !submitting && runner.ready;
  const attempt = Math.min(responses.length + 1, maxAttempts);

  function update(next: string) {
    setCode(next);
    writeDraft(key, { code: next, output: '' });
  }

  function failure(err: unknown, fallback: string) {
    setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback);
  }

  async function handleRun() {
    if (!code.trim()) return;
    setError(null);
    try {
      const result = await runner.run(`${joinCode(prior, code)}\n`, step?.check);
      if (result) {
        setLastRun(result);
        setRanCode(code);
      }
    } catch (err) {
      failure(err, 'O laboratório não conseguiu rodar o código.');
    }
  }

  async function handleSubmit() {
    if (!canSubmit || !freshRun) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitCodeStepResponse(dailyId, activity.id, code, '', { ...toPayload(freshRun.record), checkOutput: freshRun.checkOutput });
      onDailyRefetched(await api.getDaily(dailyId));
      writeDraft(key, null);
      setLastRun(null);
      setRanCode(null);
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
      await api.requestCodeStepHint(dailyId, activity.id, code, lastRun ? toPayload(lastRun.record) : undefined);
      onDailyRefetched(await api.getDaily(dailyId));
    } catch (err) {
      failure(err, 'Não consegui pedir a dica agora. Tente de novo.');
    } finally {
      setHintLoading(false);
    }
  }

  // Linhas marcadas do código inicial: a lacuna some quando o aluno a preenche; o erro, quando ele muda a linha.
  const starterLines = starter.split('\n');
  const codeLines = code.split('\n');
  const states: Record<number, LineState> = {};
  if (view === 'escrevendo') {
    for (const mark of step?.marks ?? []) {
      const current = codeLines[mark.line - 1];
      if (mark.kind === 'Lacuna' && isOpenGap(current)) states[mark.line] = 'lacuna';
      if (mark.kind === 'Erro' && current === starterLines[mark.line - 1]) states[mark.line] = 'erro';
    }
  }

  const regionValue = view === 'passou' ? (responses.find((r) => r.passed)?.transcript ?? code) : view === 'solucao' ? (step?.solution ?? '') : code;
  const total = priorLines + (priorLines > 0 ? 1 : 0) + lineTotal(regionValue);
  const status = [
    runner.language,
    `${total} ${total === 1 ? 'linha' : 'linhas'}`,
    view === 'solucao' ? 'solução' : view === 'passou' ? 'aprovado' : responses.length > 0 ? `${attempt}ª tentativa` : freshRun ? 'rodou' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const submitLabel = submitting ? 'Conferindo...' : isFix ? 'Enviar a correção' : responses.length > 0 ? `Enviar a ${attempt}ª tentativa` : 'Enviar o passo';
  const reason = freshRun ? null : lastRun ? 'Rode de novo: o código mudou' : isFix ? 'Corrija e rode de novo' : responses.length > 0 ? 'Mude o código e rode de novo' : 'Rode o script para liberar';
  const lastHint = hints.at(-1);

  return (
    <SessionLayout>
      <p className="text-lead text-primary">{view === 'solucao' ? 'Solução de referência' : title}</p>
      {view === 'escrevendo' && detail && (
        <div className="[&_p]:text-corpo">
          <MarkdownBlock text={detail} />
        </div>
      )}

      {view === 'escrevendo' && lastResponse && !lastResponse.passed && (
        <FocadaLine size="devolutiva" tone="erro" label={`Focada · errou · tentativa ${responses.length} de ${maxAttempts}`}>
          {lastResponse.aiFeedback}
        </FocadaLine>
      )}
      {view === 'escrevendo' && lastHint && (
        <div className="flex flex-col gap-1 text-pequeno">
          <p className="text-secondary">
            <span className="text-rotulo-sm text-project">Dica da Focada · </span>
            {lastHint.improve}
          </p>
          <p className="text-muted">
            Certo: {lastHint.right} · Errado: {lastHint.wrong}
          </p>
        </div>
      )}
      {view === 'passou' && (
        <FocadaLine size="devolutiva" tone="acerto" label="Focada · passou">
          {lastResponse?.aiFeedback}
        </FocadaLine>
      )}
      {view === 'solucao' && (
        <>
          <FocadaLine size="devolutiva" tone="neutro" label={`Focada · ${maxAttempts} de ${maxAttempts}`}>
            {lastResponse?.aiFeedback} A solução está no editor: leia linha a linha antes de seguir, o próximo passo parte dela.
          </FocadaLine>
          {step?.expectedOutput && (
            <div className="flex flex-col gap-1">
              <p className="text-rotulo-sm text-secondary">Saída esperada</p>
              <pre className="whitespace-pre-wrap break-words border-2 border-stroke bg-base px-3 py-2 text-codigo text-primary">{step.expectedOutput}</pre>
            </div>
          )}
        </>
      )}
      {error && <p className="text-pequeno text-alert">{error}</p>}

      <BridgeCodeColumn>
        <BridgeEditor
          fileName={daily.lab?.entry ?? 'script'}
          status={status}
          prior={prior}
          closedLines={closedLinesFor(daily, activity.id)}
          closedLabel={closedBlocksLabel(position.block)}
          errorLine={view === 'escrevendo' ? failedLine : null}
          region={{
            value: regionValue,
            onChange: view === 'escrevendo' ? update : undefined,
            states,
            indent,
            placeholder: kind === 'sozinho' && !starter ? `# bloco ${position.block ?? ''}: escreva aqui` : undefined,
            onSubmitShortcut: handleRun,
            label: `Seu código, a partir da linha ${regionStart}`,
          }}
        />
        <BridgeTerminal
          lines={runner.lines}
          command={daily.lab?.command ?? ''}
          onRun={view === 'escrevendo' ? () => void handleRun() : undefined}
          running={runner.running}
          runDisabled={!code.trim()}
          status={runner.status}
          emptyText="Ainda não rodou. Aperte Rodar."
        />
      </BridgeCodeColumn>

      <SessionFooter>
        {view === 'escrevendo' ? (
          <>
            {reason && <p className="text-pequeno text-muted">{reason}</p>}
            {(step?.maxHints ?? 0) > 0 && (
              <Button kind="secundario" onClick={handleHint} disabled={!code.trim() || hintsLeft <= 0 || hintLoading}>
                {hintLoading ? 'Pensando...' : hintsLeft > 0 ? `Dica · ${hintsLeft}` : 'Sem dicas'}
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </>
        ) : (
          <Button onClick={onContinue}>{view === 'passou' ? 'Continuar' : 'Seguir'}</Button>
        )}
      </SessionFooter>
    </SessionLayout>
  );
}
