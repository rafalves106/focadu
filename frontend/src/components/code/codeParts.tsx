import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { TONE_BORDER, lineCount } from './codeHelpers';

/**
 * Editor do passo (Fase 79, Figma "Ponte: code comigo"): numeros de linha continuando do script dos
 * passos anteriores, Fira Code, sem quebra de linha, Tab indenta. Cresce com o conteudo - quem rola e
 * o cartao da sessao, entao a numeracao nunca desalinha.
 *
 * Fase 87 (laboratorio): `errorLine` marca em ambar a linha que o erro da execucao citou (a numeracao do
 * editor e a do script inteiro, entao o numero do erro cai direto na linha certa).
 */
export function CodeEditor({
  value,
  onChange,
  startLine = 1,
  tone = 'stroke',
  indent = '    ',
  placeholder,
  onSubmitShortcut,
  label,
  errorLine = null,
  minLines = 8,
}: {
  value: string;
  onChange?: (value: string) => void;
  startLine?: number;
  tone?: keyof typeof TONE_BORDER;
  indent?: string;
  placeholder?: string;
  onSubmitShortcut?: () => void;
  label: string;
  errorLine?: number | null;
  /** Linhas minimas do editor editavel (o laboratorio usa menos pra a saida caber na vista). */
  minLines?: number;
}) {
  const lines = Math.max(lineCount(value), onChange ? minLines : 1);
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

  const errorIndex = errorLine !== null && errorLine >= startLine && errorLine < startLine + lines ? errorLine - startLine : null;

  return (
    <div className={`relative flex overflow-x-auto border-2 bg-surface px-3.5 py-2.5 ${TONE_BORDER[tone]}`}>
      {errorIndex !== null && (
        <span
          aria-hidden="true"
          data-testid="linha-com-erro"
          className="pointer-events-none absolute inset-x-0 border-l-[3px] border-project bg-project/15"
          style={{ top: `calc(0.625rem + ${errorIndex} * 1.25rem)`, height: '1.25rem' }}
        />
      )}
      <pre aria-hidden="true" className="relative shrink-0 select-none pr-3.5 text-right font-mono text-[13px] leading-5 text-muted">
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
          className="relative min-w-0 flex-1 resize-none overflow-hidden whitespace-pre bg-transparent font-mono text-[13px] leading-5 text-primary outline-none placeholder:text-muted"
        />
      ) : (
        <pre aria-label={label} className="relative min-w-0 flex-1 whitespace-pre font-mono text-[13px] leading-5 text-primary">
          {value}
        </pre>
      )}
    </div>
  );
}

export function OutputBox({
  value,
  onChange,
  onSubmitShortcut,
  placeholder,
  tone = 'stroke',
  children,
}: {
  value: string;
  onChange?: (value: string) => void;
  onSubmitShortcut?: () => void;
  placeholder?: string;
  tone?: 'stroke' | 'project';
  children?: ReactNode;
}) {
  const className = `w-full border-2 bg-base px-3.5 py-2.5 font-mono text-xs leading-[18px] outline-none focus:border-accent ${
    tone === 'project' ? 'border-project text-project' : 'border-stroke text-secondary'
  }`;
  if (!onChange) {
    return (
      <div className={className}>
        {children}
        {value !== '' && <pre className="overflow-x-auto whitespace-pre">{value}</pre>}
      </div>
    );
  }
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
