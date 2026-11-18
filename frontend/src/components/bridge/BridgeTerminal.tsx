import { useEffect, useRef } from 'react';
import type { TerminalLine, TerminalTone } from '../../lib/bridgeTerminal';
import { Button } from '../ui/Button';

const TONE: Record<TerminalTone, string> = {
  comando: 'text-muted',
  saida: 'text-primary',
  erro: 'text-alert',
  conferencia: 'text-project',
};

/**
 * Ponte/Terminal (Fase 113, Figma `108:245`): embaixo do editor, altura fixa (292 no desktop, 220 no notebook, 120 a
 * 212 no celular). Cabeçalho com "Terminal", o comando (some no celular) e o Rodar (Botão Secundário, desabilitado
 * quando não há o que rodar). Saída em Terminal/Linha: Comando apagado, Saída em texto primário (verde não), Erro em
 * vermelho, Conferência em âmbar. Quando passa da altura, mostra o fim e rola por dentro.
 */
export function BridgeTerminal({
  lines,
  title = 'Terminal',
  command,
  onRun,
  running = false,
  runDisabled = false,
  emptyText,
  status,
}: {
  lines: TerminalLine[];
  /** "Terminal" ou "Prévia" (Abertura: a saída do script pronto). */
  title?: string;
  /** "python3 inspetor.py" ou "saída do script pronto". */
  command: string;
  onRun?: () => void;
  running?: boolean;
  runDisabled?: boolean;
  /** Texto apagado quando ainda não rodou ("Ainda não rodou. Aperte Rodar."). */
  emptyText: string;
  /** Linha extra no fim, enquanto prepara ou roda ("▲ rodando…"). */
  status?: string | null;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, status]);

  return (
    <section
      className="flex h-[clamp(120px,26dvh,212px)] shrink-0 flex-col border-2 border-stroke bg-base md:h-[292px] lg:short:h-[220px]"
      aria-label={title}
      data-testid="ponte-terminal"
    >
      <header className="flex shrink-0 items-center gap-3 border-b-2 border-stroke py-1 pr-1 pl-4">
        <span className="text-rotulo-sm text-secondary">{title}</span>
        <span className="hidden truncate text-rotulo-sm text-muted md:inline">{command}</span>
        <span className="flex-1" />
        <Button kind="secundario" onClick={onRun} disabled={!onRun || runDisabled || running}>
          {running ? 'Rodando' : 'Rodar'}
        </Button>
      </header>
      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-2" aria-live="polite">
        {lines.length === 0 && !status && <p className="text-codigo text-muted">{emptyText}</p>}
        {lines.map((line, i) => (
          <p key={i} className={`whitespace-pre-wrap break-words text-codigo ${TONE[line.tone]}`}>
            {line.text || ' '}
          </p>
        ))}
        {status && <p className="text-codigo text-project">{status}</p>}
      </div>
    </section>
  );
}
