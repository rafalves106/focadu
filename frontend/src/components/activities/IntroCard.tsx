/**
 * Tela de intro de uma atividade (Fase 9, design Figma "Quiz 1 — Intro" etc, uniformizado pras
 * 4 atividades avaliaveis). Estado local em cada componente de atividade (`started`) - nao existe
 * como passo separado no `Step` do TodayPage, so um gate visual antes da pergunta/desafio/cenario,
 * pra nao mudar a maquina de estado existente.
 */
export function IntroCard({
  badge,
  title,
  description,
  rules,
  ctaLabel,
  onStart,
}: {
  badge: string;
  title: string;
  description: string;
  rules?: string[];
  ctaLabel: string;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-stroke bg-surface p-10">
      <span className="w-fit rounded-full bg-surface-alt px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
        {badge}
      </span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="text-sm text-secondary">{description}</p>
      </div>

      {rules && rules.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-stroke pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">Como funciona</p>
          <ul className="flex flex-col gap-2">
            {rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 text-sm text-primary">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        className="rounded-xl bg-accent py-4 text-sm font-bold tracking-wide text-base"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
