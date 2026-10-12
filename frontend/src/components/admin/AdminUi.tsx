import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Fase 94, Painel de gestao (Figma "Painel de gestao — v1", pagina 263:4502): pecas comuns das abas.

/** Quadro "// ROTULO  contexto" com borda de 2px - as listas rolam por dentro, nunca a pagina. */
export function AdminPanel({
  label,
  context,
  action,
  accent = false,
  className = '',
  children,
}: {
  label: string;
  context?: ReactNode;
  action?: ReactNode;
  accent?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col gap-3 border-2 bg-base px-5 py-4 ${accent ? 'border-accent' : 'border-stroke'} ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-3">
          <h2 className="font-pixel-label text-[9px] text-accent">// {label}</h2>
          {context && <p className="text-[12px] text-secondary">{context}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Cartao de metrica: rotulo pequeno, numero grande (Silkscreen) e uma linha de detalhe. */
export function StatCard({ label, value, detail, highlight = false }: { label: string; value: ReactNode; detail?: ReactNode; highlight?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 border-2 bg-base px-4 py-4 ${highlight ? 'border-accent' : 'border-stroke'}`}>
      <p className={`truncate font-pixel-label text-[8px] ${highlight ? 'text-accent' : 'text-secondary'}`}>{label}</p>
      <p className={`font-pixel-label text-[20px] leading-none ${highlight ? 'text-accent' : 'text-primary'}`}>{value}</p>
      {detail && <p className="truncate text-[12px] text-secondary">{detail}</p>}
    </div>
  );
}

const CHIP_TONES = {
  accent: 'border-accent text-accent',
  alert: 'border-alert text-alert',
  amber: 'border-project text-project',
  muted: 'border-muted text-secondary',
} as const;

export function Chip({ tone, children }: { tone: keyof typeof CHIP_TONES; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center border-2 px-2 py-1 font-pixel-label text-[7px] ${CHIP_TONES[tone]}`}>{children}</span>;
}

const BUTTON_TONES = {
  primary: 'border-accent bg-accent text-base hover:bg-accent/85',
  outline: 'border-stroke text-secondary hover:border-secondary hover:text-primary',
  danger: 'border-alert text-alert hover:bg-alert/10',
  dangerSolid: 'border-alert bg-alert text-base hover:bg-alert/85',
  selected: 'border-accent bg-accent text-base',
} as const;

export function PixelButton({
  tone = 'outline',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: keyof typeof BUTTON_TONES; size?: 'sm' | 'md' }) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-[7px]' : 'h-10 px-4 text-[8px]';
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 items-center justify-center gap-2 border-2 font-pixel-label tracking-[0.06em] disabled:cursor-not-allowed disabled:opacity-40 ${sizing} ${BUTTON_TONES[tone]} ${className}`}
    />
  );
}

/** Interruptor "OCULTAR NOMES" (so nesta tela, nao e salvo). */
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3">
      <span className={`flex h-5 w-10 items-center border-2 p-0.5 ${checked ? 'justify-end border-accent' : 'justify-start border-secondary'}`}>
        <span className={`size-3 ${checked ? 'bg-accent' : 'bg-secondary'}`} />
      </span>
      <span className={`font-pixel-label text-[8px] ${checked ? 'text-accent' : 'text-secondary'}`}>{label}</span>
    </button>
  );
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

/** Titulo de coluna ordenavel: a seta marca a coluna ativa. */
export function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <th className={`px-3 py-2 font-normal ${ALIGN[align]}`}>
      <button type="button" onClick={onClick} className={`font-pixel-label text-[7px] ${active ? 'text-accent' : 'text-secondary hover:text-primary'}`}>
        {label} {active ? (direction === 'desc' ? '▼' : '▲') : '↕'}
      </button>
    </th>
  );
}

/** Faixa de resultado de acao (sucesso verde, falha vermelha) - some quando o admin fecha. */
export function ResultBanner({ tone, children, onClose }: { tone: 'success' | 'error'; children: ReactNode; onClose?: () => void }) {
  const color = tone === 'success' ? 'border-accent text-accent' : 'border-alert text-alert';
  return (
    <div role="status" className={`flex items-center justify-between gap-3 border-2 bg-base px-4 py-3 ${color}`}>
      <p className="text-[13px] text-primary">
        <span className={`mr-2 font-pixel-label text-[8px] ${tone === 'success' ? 'text-accent' : 'text-alert'}`}>{tone === 'success' ? 'FEITO' : 'FALHOU'}</span>
        {children}
      </p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fechar aviso" className="font-pixel-label text-[10px] text-secondary hover:text-primary">
          X
        </button>
      )}
    </div>
  );
}

/** Esqueleto cinza do carregando. */
export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 animate-pulse bg-surface-alt" />
      ))}
    </div>
  );
}

/** Erro no lugar do conteudo, com "Tentar de novo" e um codigo pra achar no log. */
export function PanelError({ message, code, onRetry }: { message: string; code?: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 border-2 border-alert bg-base px-5 py-4">
      <p className="font-pixel-label text-[9px] text-alert">NÃO DEU PRA CARREGAR</p>
      <p className="text-[13px] text-primary">{message}</p>
      {code && <p className="font-mono text-[11px] text-muted">código: {code}</p>}
      <PixelButton tone="danger" onClick={onRetry}>
        Tentar de novo
      </PixelButton>
    </div>
  );
}

/** Lista vazia: frase curta da Focada no lugar da tabela. */
export function EmptyPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-2 border-dashed border-stroke px-5 py-6">
      <p className="font-pixel-label text-[9px] text-primary">{title}</p>
      <p className="text-[13px] text-secondary">{children}</p>
    </div>
  );
}

/** Campo com rotulo, ajuda e erro (gavetas e modais). */
export function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-pixel-label text-[8px] text-secondary">{label}</span>
      {children}
      {error ? <span className="text-[12px] text-alert">{error}</span> : help && <span className="text-[12px] text-muted">{help}</span>}
    </label>
  );
}


/** Barra de 24 blocos de pixel (sem gradiente, igual a do Ranking): `filled` de 0 a 24. */
export function BlockBar({ filled, blocks = 24, color = 'bg-accent' }: { filled: number; blocks?: number; color?: string }) {
  return (
    <div className="flex gap-[2px]" aria-hidden="true">
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className={`h-3 flex-1 ${i < filled ? color : 'bg-surface-alt'}`} />
      ))}
    </div>
  );
}
