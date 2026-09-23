/**
 * Conta-giros de erros da sessao (Fase 68) - saiu do menu global (antigo `PenaltyHeaderBadge`, Fase
 * 36) e foi pro topo da propria sessao, ao lado do titulo do dia: o menu e global e unico em todas as
 * telas. Um bloco por erro possivel antes do reforco (`penaltyThreshold`, sempre vindo do backend).
 */
export function ErrorGauge({ penaltyPoints, penaltyThreshold, compact = false }: { penaltyPoints: number; penaltyThreshold: number; compact?: boolean }) {
  const hot = penaltyPoints > 0;
  return (
    <div
      className={`flex shrink-0 items-center border-2 border-secondary bg-base ${compact ? 'gap-2 px-2 py-1.5' : 'gap-3 px-4 py-2.5'}`}
      title={`${penaltyThreshold} erros na sessão geram um reforço`}
      aria-label={`Erros da sessão: ${penaltyPoints} de ${penaltyThreshold}`}
    >
      {!compact && <span className="font-pixel-label text-[9px] text-secondary">Erros da sessão</span>}
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: penaltyThreshold }, (_, i) => (
          <span key={i} className={`border-2 ${compact ? 'size-2.5' : 'size-4'} ${i < penaltyPoints ? 'border-alert bg-alert' : 'border-stroke bg-surface-alt'}`} />
        ))}
      </span>
      <span className={`font-pixel leading-none ${compact ? 'text-lg' : 'text-2xl'} ${hot ? 'text-alert' : 'text-primary'}`}>
        {Math.min(penaltyPoints, penaltyThreshold)}/{penaltyThreshold}
      </span>
      {!compact && <span className="hidden font-pixel-label text-[8px] text-muted xl:inline">{penaltyThreshold} erros = reforço</span>}
    </div>
  );
}
