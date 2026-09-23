/**
 * Barra de progresso segmentada pixel art (mesma do HUD da trilha, CourseDetailPage) - blocos retos,
 * sem arredondar nem animar. `segments` = quantos blocos (30 na trilha: 1 bloco = 2 dias num curso de 60).
 */
export function SegmentedBar({
  percentage,
  label,
  segments = 30,
  tone = 'bg-accent',
  heightClass = 'h-2.5',
}: {
  percentage: number;
  label: string;
  segments?: number;
  tone?: string;
  heightClass?: string;
}) {
  const filled = Math.floor((Math.min(100, Math.max(0, percentage)) / 100) * segments);
  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="flex gap-1"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`${heightClass} flex-1 ${i < filled ? tone : 'bg-stroke'}`} />
      ))}
    </div>
  );
}
