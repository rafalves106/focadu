import { useState, type DragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { DailyActivityDto, DailyStateDto } from '../../api/types';
import { bridgePosition, closedBlocksLabel, lineTotal } from '../../lib/bridgeSteps';
import { useBridgeRunner } from '../../lib/useBridgeRunner';
import { useIsDesktop } from '../../lib/useIsDesktop';
import { MarkdownBlock } from '../activities/MarkdownBlock';
import { splitPrompt } from '../code/codeHelpers';
import { BridgeCodeColumn, SessionFooter, SessionLayout } from '../SessionShell';
import { Button } from '../ui/Button';
import { FocadaLine } from '../ui/FocadaLine';
import { BridgeEditor } from './BridgeEditor';
import { BridgeTerminal } from './BridgeTerminal';

type RowState = 'padrao' | 'selecionada' | 'certa' | 'errada';

const ROW_CLASS: Record<RowState, string> = {
  padrao: 'border-stroke bg-surface',
  selecionada: 'border-accent bg-accent-tint',
  certa: 'border-accent bg-surface',
  errada: 'border-alert bg-alert-tint',
};

const ROW_MARK: Partial<Record<RowState, { text: string; tone: string }>> = {
  selecionada: { text: '↑ ↓ mover', tone: 'text-accent' },
  certa: { text: 'no lugar', tone: 'text-accent' },
  errada: { text: 'fora do lugar', tone: 'text-alert' },
};

/** Alça de 6x10 na grade de 2 px (Parsons/Linha `108:93`). */
function Handle({ active }: { active: boolean }) {
  return (
    <span className="grid h-2.5 w-1.5 shrink-0 grid-cols-2 gap-0.5" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className={`size-0.5 ${active ? 'bg-accent' : 'bg-muted'}`} />
      ))}
    </span>
  );
}

/**
 * Ordenar linhas (Parsons, Fase 113; quadros `111:1540` e `115:2395`). As linhas do trecho chegam embaralhadas dentro do
 * editor fixo, depois das linhas fixas (a lista que o `for` percorre), já com o recuo certo. Desktop: arrastar, ou
 * selecionar e mover com ↑ ↓; celular: tocar seleciona e os botões ↑ ↓ movem. "Conferir a ordem" manda a ordem pro
 * servidor, que dá a nota; Certa/Errada aparece por linha só depois de conferir. Não conta erro do dia; na última
 * conferência errada a ordem certa aparece e o Fazer seguinte parte dela. O terminal fica sem Rodar (no celular some).
 */
export function ParsonsActivity({
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
  const isDesktop = useIsDesktop();
  const parsons = activity.parsons;
  const responses = activity.responses;
  const lastResponse = responses.at(-1) ?? null;
  const done = parsons?.done ?? false;
  const passed = responses.some((r) => r.passed);
  const maxAttempts = parsons?.maxAttempts ?? 3;

  const submitted = lastResponse?.transcript?.split('\n') ?? null;
  const [order, setOrder] = useState<string[]>(() => (done && parsons?.solution ? parsons.solution : (submitted ?? parsons?.lines ?? [])));
  const [selected, setSelected] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!parsons) return null;
  const position = bridgePosition(daily, activity.id);
  const { title, detail } = splitPrompt(activity.prompt);
  // Certa/Errada só vale para a ordem conferida - mexeu, volta pro Padrão.
  const checked = done ? order.map(() => true) : submitted && parsons.lastCheck && order.join('\n') === submitted.join('\n') ? parsons.lastCheck : null;

  function move(from: number, to: number) {
    if (done || to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [line] = next.splice(from, 1);
    next.splice(to, 0, line);
    setOrder(next);
    setSelected(to);
  }

  function handleKey(e: ReactKeyboardEvent<HTMLLIElement>, i: number) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(i, e.key === 'ArrowUp' ? i - 1 : i + 1);
      requestAnimationFrame(() => document.getElementById(`parsons-${activity.id}-${e.key === 'ArrowUp' ? i - 1 : i + 1}`)?.focus());
    }
  }

  async function handleCheck() {
    if (done || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitActivityResponse(dailyId, activity.id, { transcript: order.join('\n') });
      const fresh = await api.getDaily(dailyId);
      onDailyRefetched(fresh);
      const updated = fresh.activities.find((a) => a.id === activity.id)?.parsons;
      if (updated?.done && updated.solution) setOrder(updated.solution);
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível conferir a ordem. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  const prior = parsons.priorCode ?? '';
  const fixed = parsons.fixedLines.join('\n');
  const total = lineTotal(prior) + (prior ? 1 : 0) + parsons.fixedLines.length;
  const right = checked?.filter(Boolean).length ?? 0;

  const zone = (
    <div className="flex flex-col gap-2 px-3 pt-3 pb-2">
      <p className="text-rotulo-sm text-project">{isDesktop ? 'Linhas para ordenar · arraste ou use ↑ ↓' : 'Toque numa linha e mova com ↑ ↓'}</p>
      <ol className="flex flex-col gap-2" aria-label="Linhas para ordenar">
        {order.map((line, i) => {
          const state: RowState = checked ? (checked[i] ? 'certa' : 'errada') : selected === i ? 'selecionada' : 'padrao';
          const mark = ROW_MARK[state];
          return (
            <li
              key={`${line}-${i}`}
              id={`parsons-${activity.id}-${i}`}
              tabIndex={done ? -1 : 0}
              draggable={!done && isDesktop}
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e: DragEvent) => {
                e.preventDefault();
                if (dragFrom !== null && dragFrom !== i) {
                  move(dragFrom, i);
                  setDragFrom(i);
                }
              }}
              onDragEnd={() => setDragFrom(null)}
              onClick={() => !done && setSelected(i)}
              onFocus={() => !done && setSelected(i)}
              onKeyDown={(e) => handleKey(e, i)}
              aria-label={`Linha ${i + 1}: ${line.trim()}${mark ? `, ${mark.text}` : ''}`}
              className={`flex min-h-10 items-center gap-3 border-2 px-3 py-2 outline-none focus-visible:border-accent ${ROW_CLASS[state]} ${done ? '' : 'cursor-grab'}`}
            >
              <Handle active={state === 'selecionada'} />
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-codigo text-primary">{line}</span>
              {mark && <span className={`shrink-0 text-rotulo-sm ${mark.tone}`}>{mark.text}</span>}
              {state === 'selecionada' && (
                <span className="flex shrink-0 gap-1">
                  <button type="button" aria-label="Mover pra cima" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(i, i - 1); }} className="size-10 border-2 border-stroke text-primary disabled:opacity-30">
                    ↑
                  </button>
                  <button type="button" aria-label="Mover pra baixo" disabled={i === order.length - 1} onClick={(e) => { e.stopPropagation(); move(i, i + 1); }} className="size-10 border-2 border-stroke text-primary disabled:opacity-30">
                    ↓
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    <SessionLayout>
      <p className="text-lead text-primary">{title}</p>
      {detail && !done && (
        <div className="[&_p]:text-corpo">
          <MarkdownBlock text={detail} />
        </div>
      )}
      {lastResponse && (
        <FocadaLine
          size="devolutiva"
          tone={passed ? 'acerto' : done ? 'neutro' : 'erro'}
          label={passed ? 'Focada · ordem certa' : done ? `Focada · ${maxAttempts} de ${maxAttempts}` : `Focada · conferência ${responses.length} de ${maxAttempts}`}
        >
          {passed
            ? 'Tudo no lugar. Agora você roda o que montou.'
            : done
              ? 'A ordem certa está no editor. Leia de cima pra baixo: o próximo passo parte dela.'
              : `${right} de ${order.length} linhas no lugar. Mova as marcadas de vermelho e confira de novo. Não conta erro do dia.`}
        </FocadaLine>
      )}
      {error && <p className="text-pequeno text-alert">{error}</p>}

      <BridgeCodeColumn>
        <BridgeEditor
          fileName={daily.lab?.entry ?? 'script'}
          status={`${runner.language} · ${total} linhas + ${order.length} para ordenar`}
          prior={prior}
          closedLines={lineTotal(prior)}
          closedLabel={closedBlocksLabel(position.block)}
          region={fixed ? { value: fixed, label: 'Linhas fixas do bloco' } : undefined}
          after={zone}
        />
        {isDesktop && <BridgeTerminal lines={[]} command={daily.lab?.command ?? ''} emptyText="Confira a ordem antes de rodar." />}
      </BridgeCodeColumn>

      <SessionFooter>
        {done ? (
          <Button onClick={onContinue}>Continuar</Button>
        ) : (
          <>
            <p className="text-pequeno text-muted">Depois: você roda o que montou</p>
            <Button onClick={handleCheck} disabled={submitting}>
              {submitting ? 'Conferindo...' : 'Conferir a ordem'}
            </Button>
          </>
        )}
      </SessionFooter>
    </SessionLayout>
  );
}
