/**
 * Barra de progresso generica (trilho + preenchimento) - extraida de SessionTopBar (Fase 7) pra
 * ser reaproveitada nas telas de navegacao (Fase 8: StartDashboard, WeeklyDetailPage,
 * CourseDetailPage). Largura controlada pelo container do chamador (w-full por padrao).
 */
export function ProgressBar({
  progress,
  tone = 'accent',
  heightClass = 'h-1.5',
}: {
  /** 0 a 1 - fora desse intervalo e travado (0 ou 1). */
  progress: number;
  tone?: 'accent' | 'project';
  heightClass?: string;
}) {
  const fillClass =
    tone === 'project' ? 'bg-project shadow-[0_0_8px_rgba(255,184,0,0.5)]' : 'bg-accent shadow-[0_0_8px_rgba(57,255,106,0.5)]';
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-full bg-surface-alt`}>
      <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
