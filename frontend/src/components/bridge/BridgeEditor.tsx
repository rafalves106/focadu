import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { isCommentLine } from '../../lib/bridgeSteps';

/** Estado do Editor/Linha (Figma `108:43`). */
export type LineState = 'normal' | 'passo' | 'lacuna' | 'erro';

const ROW_BG: Record<LineState, string> = { normal: '', passo: 'bg-accent-tint', lacuna: 'bg-project-tint', erro: 'bg-alert-tint' };
const STRIPE: Record<LineState, string> = { normal: '', passo: 'bg-accent', lacuna: 'bg-project', erro: 'bg-alert' };
const NUMBER: Record<LineState, string> = { normal: 'text-muted', passo: 'text-accent', lacuna: 'text-project', erro: 'text-alert' };
const MARK: Record<LineState, string> = { normal: 'text-muted', passo: 'text-accent', lacuna: 'text-project', erro: 'text-alert' };
const MARK_TEXT: Partial<Record<LineState, string>> = { lacuna: 'complete aqui', erro: 'erro aqui' };

/** Altura da linha (Código/16: 24). */
const ROW = 24;

/**
 * A parte do arquivo que o passo mexe (Fazer, Corrigir) ou mostra destacada (passo aprovado, solução, linhas fixas do
 * Ordenar). `states` vem por linha da região (1 = 1ª linha dela); o resto é Passo.
 */
export interface EditorRegion {
  value: string;
  onChange?: (value: string) => void;
  states?: Record<number, LineState>;
  placeholder?: string;
  onSubmitShortcut?: () => void;
  indent?: string;
  label: string;
}

/**
 * Ponte/Editor (Fase 113, Figma `108:94`): a coluna do código da ponte intercalada, sempre visível. Cabeçalho com a aba
 * do arquivo e o status ("Python · 9 linhas"); o arquivo do dia em Editor/Linha (Código/16, faixa de 4, número de 28),
 * com o passo atual em verde, a lacuna em âmbar ("complete aqui") e o erro em vermelho ("erro aqui"). Quando o arquivo
 * passa da altura do editor, as linhas dos blocos fechados recolhem numa linha só ("▸ blocos 1 e 2 · linhas 1 a 10");
 * um toque abre, e aí o editor rola por dentro. Quebra suave de linha (o número fica na 1ª linha visual).
 *
 * A região editável é um textarea transparente por cima das linhas desenhadas (mesma fonte, mesma largura, mesma
 * quebra), então a cor de cada linha e o cursor andam juntos.
 */
export function BridgeEditor({
  fileName,
  status,
  prior,
  priorFrom = Infinity,
  closedLines = 0,
  closedLabel,
  region,
  errorLine = null,
  after,
  emptyNote,
}: {
  fileName: string;
  status: string;
  /** As linhas antes da região (só leitura). */
  prior: string;
  /** No arquivo só de leitura: a partir desta linha (1-based) as linhas são do bloco atual (Passo). */
  priorFrom?: number;
  /** Linhas dos blocos fechados (as que recolhem quando o arquivo não cabe). */
  closedLines?: number;
  /** "blocos 1 e 2" - o texto da linha recolhida. */
  closedLabel?: string;
  region?: EditorRegion;
  /** Linha (do arquivo inteiro) que a última execução citou no erro. */
  errorLine?: number | null;
  /** Conteúdo depois do arquivo, dentro do editor (a zona do Ordenar). */
  after?: ReactNode;
  /** Arquivo vazio (Abertura): o aviso no lugar das linhas. */
  emptyNote?: string;
}) {
  const priorRows = prior === '' ? [] : prior.replace(/\n+$/, '').split('\n');
  const regionRows = region ? region.value.split('\n') : [];
  if (region && regionRows.length > 1 && regionRows.at(-1) === '' && !region.onChange) regionRows.pop();
  const separator = priorRows.length > 0 && region ? 1 : 0;
  const regionStart = priorRows.length + separator + 1;
  const totalLines = priorRows.length + separator + regionRows.length;

  // Recolhe os blocos fechados só quando o arquivo não cabe na altura do editor.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(Infinity);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFits(Math.floor((el.clientHeight - 16) / ROW)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [opened, setOpened] = useState(false);
  const extra = after ? 6 : 0;
  const collapse = !opened && closedLines > 0 && closedLines <= priorRows.length && totalLines + extra > fits;

  const priorState = (n: number): LineState => (n === errorLine ? 'erro' : n >= priorFrom ? 'passo' : 'normal');

  return (
    <section className="flex min-h-0 flex-1 flex-col border-2 border-stroke bg-surface" aria-label={`Arquivo ${fileName}`}>
      <header className="flex h-10 shrink-0 items-end justify-between gap-3 border-b-2 border-stroke px-4">
        <span className="border-b-2 border-accent pb-2 text-rotulo text-primary">{fileName}</span>
        <span className="pb-3 text-rotulo-sm text-muted">{status}</span>
      </header>
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto py-2" data-testid="ponte-editor">
        {emptyNote && totalLines === 0 ? (
          <>
            <Row number={1} state="normal" text="" />
            <p className="mt-4 pl-14 text-pequeno text-muted">{emptyNote}</p>
          </>
        ) : (
          <>
            {collapse ? (
              <>
                <button type="button" onClick={() => setOpened(true)} className="block w-full text-left hover:bg-surface-alt" aria-label={`Abrir ${closedLabel ?? 'blocos fechados'}`}>
                  <Row number={1} state="normal" text={`▸ ${closedLabel ?? 'blocos fechados'} · linhas 1 a ${closedLines} (toque para abrir)`} comment />
                </button>
                {priorRows.slice(closedLines).map((text, i) => {
                  const n = closedLines + i + 1;
                  return <Row key={n} number={n} state={priorState(n)} text={text} />;
                })}
              </>
            ) : (
              priorRows.map((text, i) => <Row key={i} number={i + 1} state={priorState(i + 1)} text={text} />)
            )}
            {separator === 1 && <Row number={priorRows.length + 1} state="normal" text="" />}
            {region && <RegionRows region={region} rows={regionRows} start={regionStart} errorLine={errorLine} />}
          </>
        )}
        {after}
      </div>
    </section>
  );
}

function Row({ number, state, text, comment, mark }: { number: number; state: LineState; text: string; comment?: boolean; mark?: string | null }) {
  const isComment = comment ?? isCommentLine(text);
  const markText = mark === undefined ? MARK_TEXT[state] : mark;
  return (
    <div className={`relative flex min-h-6 items-start gap-3 pr-3 ${ROW_BG[state]}`}>
      <span className={`w-1 self-stretch ${STRIPE[state]}`} aria-hidden="true" />
      <span className={`w-7 shrink-0 text-right text-codigo ${NUMBER[state]}`}>{number}</span>
      <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-codigo ${isComment ? 'text-muted' : 'text-primary'}`}>{text || ' '}</span>
      {markText && <span className={`absolute top-1 right-3 bg-inherit pl-2 text-rotulo-sm ${MARK[state]}`}>{markText}</span>}
    </div>
  );
}

/** A região do passo: linhas desenhadas e, se editável, o textarea transparente por cima delas. */
function RegionRows({ region, rows, start, errorLine }: { region: EditorRegion; rows: string[]; start: number; errorLine: number | null }) {
  const stateOf = (i: number): LineState => (start + i === errorLine ? 'erro' : (region.states?.[i + 1] ?? 'passo'));
  const editable = !!region.onChange;

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      region.onSubmitShortcut?.();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && region.onChange) {
      e.preventDefault();
      const el = e.currentTarget;
      const indent = region.indent ?? '    ';
      const { selectionStart, selectionEnd } = el;
      region.onChange(region.value.slice(0, selectionStart) + indent + region.value.slice(selectionEnd));
      requestAnimationFrame(() => el.setSelectionRange(selectionStart + indent.length, selectionStart + indent.length));
    }
  }

  return (
    <div className="relative">
      {rows.map((text, i) => {
        const state = stateOf(i);
        const placeholder = editable && region.value === '' && i === 0 ? region.placeholder : undefined;
        return (
          <div key={i} className={`relative flex min-h-6 items-start gap-3 pr-3 ${ROW_BG[state]}`}>
            <span className={`w-1 self-stretch ${STRIPE[state]}`} aria-hidden="true" />
            <span className={`w-7 shrink-0 text-right text-codigo ${NUMBER[state]}`}>{start + i}</span>
            <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-codigo ${placeholder ? 'text-muted' : isCommentLine(text) ? 'text-muted' : 'text-primary'}`}>
              {placeholder ?? (text || ' ')}
            </span>
            {MARK_TEXT[state] && <span className={`pointer-events-none absolute top-1 right-3 pl-2 text-rotulo-sm ${MARK[state]}`}>{MARK_TEXT[state]}</span>}
          </div>
        );
      })}
      {editable && (
        <textarea
          value={region.value}
          onChange={(e) => region.onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          wrap="soft"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label={region.label}
          className="absolute inset-y-0 right-3 left-14 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent text-codigo text-transparent caret-primary outline-none selection:bg-accent/30 selection:text-transparent"
        />
      )}
    </div>
  );
}
