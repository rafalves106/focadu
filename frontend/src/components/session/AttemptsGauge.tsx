/**
 * Tentativas do passo de codigo (Fase 79, Figma "Ponte: code comigo") - no lugar do conta-giros de
 * erros enquanto a etapa em tela e um passo de codigo: ajustar um passo nao e erro da sessao. Um
 * bloco ambar por tentativa sem passar; passou, fica verde. Na ultima, a solucao aparece.
 */
export function AttemptsGauge({ attempts, maxAttempts, passed, compact = false }: { attempts: number; maxAttempts: number; passed: boolean; compact?: boolean }) {
  const failed = passed ? attempts - 1 : attempts;
  return (
    <div
      className={`flex shrink-0 items-center border-2 border-secondary bg-base ${compact ? 'gap-2 px-2 py-1.5' : 'gap-3 px-4 py-2.5'}`}
      title={`Na ${maxAttempts}ª tentativa sem passar, a solução do passo aparece`}
      aria-label={`Tentativas do passo: ${attempts} de ${maxAttempts}`}
    >
      {!compact && <span className="font-pixel-label text-[9px] text-secondary">Tentativas do passo</span>}
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: maxAttempts }, (_, i) => (
          <span
            key={i}
            className={`border-2 ${compact ? 'size-2.5' : 'size-4'} ${
              i < failed ? 'border-project bg-project' : passed && i === failed ? 'border-accent bg-accent' : 'border-stroke bg-surface-alt'
            }`}
          />
        ))}
      </span>
      <span className={`font-pixel leading-none ${compact ? 'text-lg' : 'text-2xl'} ${passed ? 'text-accent' : failed > 0 ? 'text-project' : 'text-primary'}`}>
        {Math.min(attempts, maxAttempts)}/{maxAttempts}
      </span>
      {!compact && <span className="hidden font-pixel-label text-[8px] text-muted xl:inline">Na {maxAttempts}ª, a solução aparece</span>}
    </div>
  );
}
