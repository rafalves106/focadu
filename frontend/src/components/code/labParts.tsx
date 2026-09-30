import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CodeStepHintDto } from '../../api/types';
import type { LabSnapshot } from '../../lab/labSession';
import { formatMegabytes } from '../../lab/labOutput';

/** Chip do runtime ao lado do nome do arquivo: "● PYTHON 3.12 · SCAPY · PRONTO" (Figma "Laboratório de código", quadros 01 e 02). */
export function LabChip({ label, snapshot }: { label: string; snapshot: LabSnapshot }) {
  const { status, progress, restarting } = snapshot;
  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
  let state: string;
  let tone: string;
  if (status === 'error') {
    state = 'ERRO AO INICIAR';
    tone = 'text-alert';
  } else if (status === 'loading' || restarting) {
    state = restarting ? 'REINICIANDO' : pct !== null ? `PREPARANDO ${pct}%` : 'PREPARANDO';
    tone = 'text-project';
  } else if (status === 'running') {
    state = 'RODANDO';
    tone = 'text-project';
  } else if (status === 'ready') {
    state = 'PRONTO';
    tone = 'text-accent';
  } else {
    state = 'PARADO';
    tone = 'text-secondary';
  }
  return (
    <p className={`font-pixel-label text-[8px] ${tone}`} data-testid="lab-chip">
      ● {label} · {state}
    </p>
  );
}

/** Barra de blocos do download/boot do runtime - "Baixando Python + Scapy · 5,4 de 15,2 MB" (Figma, quadro 02). */
export function LabProgressBar({ snapshot }: { snapshot: LabSnapshot }) {
  const { progress } = snapshot;
  const total = 24;
  const filled = progress && progress.total > 0 ? Math.round((progress.loaded / progress.total) * total) : 0;
  const isDownload = progress !== null && progress.total > 100_000;
  const text = !progress
    ? 'Preparando o laboratório…'
    : isDownload
      ? progress.loaded >= progress.total
        ? `${progress.label} baixado. Iniciando…`
        : `Baixando ${progress.label} · ${formatMegabytes(progress.loaded)} de ${formatMegabytes(progress.total)} MB`
      : `${progress.label}…`;
  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite" data-testid="lab-progress">
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-3.5 w-2.5 ${i < filled ? 'bg-accent' : 'bg-stroke'}`} />
        ))}
      </div>
      <p className="font-mono text-xs leading-[18px] text-secondary">{text}</p>
      <p className="font-mono text-xs leading-[18px] text-secondary">Você já pode escrever; o laboratório libera quando terminar.</p>
    </div>
  );
}

/** A dica da Focada em tres blocos (Figma, quadro 04): o que esta certo, onde errou, o que melhorar. */
export function HintPanel({ hint, max, onClose }: { hint: CodeStepHintDto; max: number; onClose: () => void }) {
  const blocks = [
    { title: 'O que está certo', text: hint.right, color: 'text-accent' },
    { title: 'Onde errou', text: hint.wrong, color: 'text-project' },
    { title: 'O que melhorar', text: hint.improve, color: 'text-primary' },
  ];
  return (
    <section className="flex flex-col gap-2 border-2 border-project bg-base px-3.5 pt-2.5 pb-3" aria-label="Dica da Focada" data-testid="lab-hint">
      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel-label text-[8px] text-project">
          Focada · Dica {hint.number} de {max} · Não gasta tentativa
        </p>
        <button type="button" onClick={onClose} className="font-pixel-label text-[8px] text-secondary hover:text-primary">
          Voltar à saída
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3 md:gap-4">
        {blocks.map((block) => (
          <div key={block.title} className="flex min-w-0 flex-col gap-1">
            <p className={`font-pixel-label text-[8px] ${block.color}`}>{block.title}</p>
            <p className="font-pixel text-[17px] leading-5 text-primary">{block.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export interface TerminalEntry {
  command: string;
  output: string;
  exitCode: number;
}

/**
 * Terminal do Linux (Figma, quadro 05): o aluno digita a linha de comando e a saida aparece aqui. Cada
 * comando vira uma entrada do historico - e o historico que vai pra Focada junto com o envio e a dica.
 */
export function TerminalPanel({
  entries,
  onRun,
  busy,
  disabled,
  serviceLabel,
  placeholder,
}: {
  entries: TerminalEntry[];
  onRun: (command: string) => void;
  busy: boolean;
  disabled: boolean;
  serviceLabel: string | null;
  placeholder: string;
}) {
  const [command, setCommand] = useState('');
  const [recall, setRecall] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, busy]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = command.trim();
    if (!text || busy || disabled) return;
    setCommand('');
    setRecall(null);
    onRun(text);
  }

  function handleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    if (entries.length === 0) return;
    e.preventDefault();
    const next = e.key === 'ArrowUp' ? Math.max(0, (recall ?? entries.length) - 1) : Math.min(entries.length, (recall ?? entries.length) + 1);
    setRecall(next >= entries.length ? null : next);
    setCommand(next >= entries.length ? '' : entries[next].command);
  }

  return (
    <div className="flex flex-col gap-1.5 border-2 border-stroke bg-base px-3.5 py-2" data-testid="lab-terminal">
      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel-label text-[8px] text-secondary">Terminal do laboratório</p>
        {serviceLabel && <p className="font-pixel-label text-[8px] text-accent">● {serviceLabel}</p>}
      </div>
      <div ref={logRef} className="max-h-36 min-h-14 overflow-y-auto font-mono text-xs leading-[14px] text-secondary" aria-live="polite">
        {entries.map((entry, i) => (
          <div key={i}>
            <div>
              <span className="text-accent">~%</span> <span className="text-primary">{entry.command}</span>
            </div>
            {entry.output && <pre className="whitespace-pre-wrap">{entry.output}</pre>}
          </div>
        ))}
        {busy && <p className="text-project">▲ rodando…</p>}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 font-mono text-xs">
        <span className="text-accent">~%</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || busy}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Comando do terminal"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-muted disabled:opacity-50"
        />
      </form>
    </div>
  );
}
