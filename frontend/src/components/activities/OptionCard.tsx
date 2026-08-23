type OptionState = 'neutral' | 'selected' | 'correct' | 'wrong' | 'dimmed';

const STATE_CLASS: Record<OptionState, string> = {
  neutral: 'border-stroke bg-surface text-primary enabled:hover:border-secondary',
  // Fase 19 (Figma "Quiz 3"): selecionada-mas-nao-confirmada ganha preenchimento verde translucido
  // (bg-accent/25 aproxima o "neon-green-dim" #1f5c33 do design), nao so a borda como antes.
  selected: 'border-accent bg-accent/25 text-primary',
  correct: 'border-accent bg-accent/10 text-primary',
  wrong: 'border-alert bg-alert/10 text-primary',
  dimmed: 'border-stroke bg-surface text-secondary opacity-40',
};

/**
 * Card de opcao reutilizavel (Fase 9, design Figma "Quiz 2/3/4/5") - usado por Quiz, cada termo do
 * WordMatch (via OptionsAnswer) e as decisoes do Roleplay. Consolida o markup de botao que antes
 * era duplicado em OptionsAnswer.tsx e RoleplayActivity.tsx.
 *
 * `label` (A/B/C/D) e opcional - Roleplay nao usa letras, so o texto da decisao.
 */
export function OptionCard({
  label,
  text,
  state,
  onClick,
  disabled,
}: {
  label?: string;
  text: string;
  state: OptionState;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const stateClass = STATE_CLASS[state];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3.5 rounded-xl border px-[18px] py-4 text-left transition-colors disabled:cursor-default ${stateClass}`}
    >
      <span
        className={[
          'flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 text-[10px]',
          state === 'correct' ? 'border-accent bg-accent text-base' : 'border-muted',
        ].join(' ')}
        aria-hidden="true"
      >
        {state === 'correct' ? '✓' : ''}
      </span>

      <span className="flex-1 text-[15px] leading-snug">
        {label && <span className="mr-1 font-bold text-primary">{label})</span>}
        {text}
      </span>

      {state === 'correct' && <span className="shrink-0 text-xs font-bold text-accent">✓ CORRETO</span>}
      {state === 'wrong' && <span className="shrink-0 text-xs font-bold text-alert">✕ SUA RESPOSTA</span>}
    </button>
  );
}
