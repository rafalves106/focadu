import { Link } from 'react-router-dom';
import { LEGAL_DOCS, type LegalDocKey } from '../../lib/legal';

/** Link para um dos documentos (Fase 102, Figma "Link legal"): abre em nova aba pra nao perder o formulario. */
export function LegalLink({ doc, newTab = true, children }: { doc: LegalDocKey; newTab?: boolean; children?: string }) {
  return (
    <Link
      to={LEGAL_DOCS[doc].path}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="text-accent underline underline-offset-2 hover:brightness-125"
    >
      {children ?? LEGAL_DOCS[doc].title}
    </Link>
  );
}

/**
 * Rodape "Termos de Uso · Politica de Privacidade" (Figma "Rodape legal"): `public` nas telas de entrada,
 * `discreet` (com a data do aceite) no fim das Configuracoes.
 */
export function LegalFooter({ variant = 'public', acceptedAt }: { variant?: 'public' | 'discreet'; acceptedAt?: string | null }) {
  const links = (
    <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <LegalLink doc="termos" />
      <span aria-hidden="true">·</span>
      <LegalLink doc="privacidade" />
    </span>
  );
  if (variant === 'discreet') {
    return (
      <div className="flex flex-col items-center gap-1 pt-1 font-pixel text-lg leading-none text-secondary">
        {links}
        {acceptedAt && <span>Aceitos em {new Date(acceptedAt).toLocaleDateString('pt-BR')}</span>}
      </div>
    );
  }
  return (
    <footer className="flex flex-col items-center gap-1 px-4 pb-6 pt-2 font-pixel text-xl leading-none text-secondary">
      {links}
      <span className="text-muted">© 2026 Focadu</span>
    </footer>
  );
}

/**
 * Caixa de aceite (Figma "Caixa de aceite"): a linha inteira clica; os dois links abrem em nova aba e nao marcam.
 */
export function TermsCheckbox({ checked, onChange, invalid, disabled }: { checked: boolean; onChange: (v: boolean) => void; invalid?: boolean; disabled?: boolean }) {
  return (
    <label
      data-guia="aceite-termos"
      className={`flex min-h-12 cursor-pointer items-start gap-3 border-2 px-3 py-2.5 font-pixel text-xl leading-tight text-primary ${
        invalid ? 'border-alert' : checked ? 'border-accent' : 'border-stroke hover:border-secondary'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 font-pixel-label text-[10px] leading-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
          checked ? 'border-accent bg-accent text-base' : invalid ? 'border-alert' : 'border-secondary'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span>
        Li e aceito os <LegalLink doc="termos" /> e a <LegalLink doc="privacidade" />, inclusive o envio da minha voz ao provedor de IA para avaliação.
      </span>
    </label>
  );
}
