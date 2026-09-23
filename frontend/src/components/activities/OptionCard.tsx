import checkIcon from '../../assets/pixel/check.png';

type OptionState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const STATE_CLASS: Record<OptionState, string> = {
  neutral: 'border-stroke bg-base text-primary enabled:hover:border-secondary',
  selected: 'border-accent bg-surface-alt text-primary',
  correct: 'border-accent bg-base text-primary',
  wrong: 'border-alert bg-base text-primary',
  dimmed: 'border-stroke bg-base text-muted',
};

const KEY_CLASS: Record<OptionState, string> = {
  neutral: 'border-secondary text-secondary',
  selected: 'border-accent text-accent',
  correct: 'border-accent text-accent',
  wrong: 'border-alert text-alert',
  dimmed: 'border-stroke text-muted',
};

/**
 * Cartao de opcao (Fase 9; pixel art na Fase 68, Figma "Daily — redesign proposto") - usado por Quiz,
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
      className={`flex w-full items-center gap-3.5 border-2 px-4 py-3 text-left transition-colors disabled:cursor-default ${STATE_CLASS[state]}`}
    >
      {label && (
        <span className={`flex size-7 shrink-0 items-center justify-center border-2 font-pixel-label text-[10px] ${KEY_CLASS[state]}`} aria-hidden="true">
          {label}
        </span>
      )}
      <span className={`flex-1 ${variant === 'term' ? 'font-pixel text-3xl leading-none' : 'font-pixel text-xl leading-tight'}`}>{text}</span>
      {state === 'correct' && <img src={checkIcon} alt="Correta" className="size-4 shrink-0 pixelated" />}
      {state === 'wrong' && <span className="shrink-0 font-pixel-label text-[11px] text-alert" aria-label="Sua resposta, errada">✕</span>}
    </button>
  );
}
