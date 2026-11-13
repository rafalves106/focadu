import { PixelIcon } from '../ui/PixelIcon';

type OptionState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const STATE_CLASS: Record<OptionState, string> = {
  neutral: 'border-stroke bg-surface text-primary enabled:hover:border-stroke-strong enabled:hover:bg-surface-alt',
  selected: 'border-accent bg-surface text-primary',
  correct: 'border-accent bg-accent-tint text-primary',
  wrong: 'border-alert bg-alert-tint text-primary',
  dimmed: 'border-stroke bg-surface text-muted',
};

const KEY_CLASS: Record<OptionState, string> = {
  neutral: 'border-stroke-strong text-secondary',
  selected: 'border-accent text-accent',
  correct: 'border-accent text-accent',
  wrong: 'border-alert text-alert',
  dimmed: 'border-stroke text-muted',
};

/**
 * Opção de resposta (Fase 9; redesign v1 na Fase 109 etapa 4, Figma `13:505`: Padrão, Selecionada, Certa, Errada, Desabilitada) - usado por Quiz,
 * Lacuna de multipla escolha, Ligar Palavras e as decisoes do Roleplay. Caixa reta de 2px; `label`
 * vira a "tecla" a esquerda (1-4 no Quiz, que tambem funcionam no teclado). `variant="term"` usa
 * VT323 grande (os termos curtos do Ligar Palavras, ex. "DNS").
 */
export function OptionCard({
  label,
  text,
  state,
  onClick,
  disabled,
  variant = 'text',
}: {
  label?: string;
  text: string;
  state: OptionState;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'text' | 'term';
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-4 border-2 px-4 py-2 text-left disabled:cursor-default ${STATE_CLASS[state]}`}
    >
      {label && (
        <span className={`flex size-8 shrink-0 items-center justify-center border-2 text-rotulo-sm ${KEY_CLASS[state]}`} aria-hidden="true">
          {label}
        </span>
      )}
      <span className={`flex-1 ${variant === 'term' ? 'text-lead' : 'text-corpo'}`}>{text}</span>
      {state === 'correct' && (
        <span className="text-accent" role="img" aria-label="Correta">
          <PixelIcon name="check" />
        </span>
      )}
      {state === 'wrong' && <span className="shrink-0 text-rotulo text-alert" aria-label="Sua resposta, errada">✕</span>}
    </button>
  );
}
