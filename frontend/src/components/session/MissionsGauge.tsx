/**
 * Missoes do dia (Figma "Laboratório de código — v2", quadros 08 a 10) - no lugar do conta-giros de erros enquanto
 * a etapa em tela e uma missao no terminal: missao nao tem tentativa nem nota. Um bloco por missao, verde quando cumprida.
 */
export function MissionsGauge({ done, total, compact = false }: { done: number; total: number; compact?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center border-2 border-secondary bg-base ${compact ? 'gap-2 px-2 py-1.5' : 'gap-3 px-4 py-2.5'}`}
      title="Missão no terminal não tem nota nem tentativa"
      aria-label={`Missões do dia: ${done} de ${total}`}
    >
      {!compact && <span className="font-pixel-label text-[9px] text-secondary">Missões do dia</span>}
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`border-2 ${compact ? 'size-2.5' : 'size-4'} ${i < done ? 'border-accent bg-accent' : 'border-stroke bg-surface-alt'}`} />
        ))}
      </span>
      <span className={`font-pixel leading-none ${compact ? 'text-lg' : 'text-2xl'} ${done === total ? 'text-accent' : 'text-primary'}`}>
        {done}/{total}
      </span>
      {!compact && <span className="hidden font-pixel-label text-[8px] text-muted xl:inline">Sem nota · sem tentativa</span>}
    </div>
  );
}
