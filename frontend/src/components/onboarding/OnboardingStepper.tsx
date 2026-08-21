const TOTAL_STEPS = 3;

/**
 * Indicador "Passo X de 3" + pontinhos de progresso (Fase 13b, design Figma "Onboarding —
 * Boas-vindas"/"Seleção de Curso Inicial") - compartilhado pelas 3 telas de onboarding
 * (Boas-vindas/Entrevista de Perfil/Seleção de Curso).
 *
 * Divergência do Figma: os 2 nodes conferidos mostram um stepper "de 4" (Boas-vindas = passo 1,
 * Seleção de Curso = passo 2) - ou seja, o próprio Figma pula direto de Boas-vindas pra Seleção,
 * sem a Entrevista de Perfil entre eles. A especificação funcional da Fase 13 (Boas-vindas ->
 * Entrevista -> Seleção, reforçada no prompt desta fase) exige a Entrevista no meio - o stepper
 * aqui reflete esses 3 passos reais, não a contagem "de 4" do Figma.
 */
export function OnboardingStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-4">
      <span className="rounded-full border border-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
        Passo {step} de {TOTAL_STEPS}
      </span>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <span key={i} className={`h-1.5 w-6 rounded-full ${i < step ? 'bg-accent' : 'bg-surface-alt'}`} />
        ))}
      </div>
    </div>
  );
}
