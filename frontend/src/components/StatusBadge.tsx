import type { StatusBadgeTone } from '../lib/statusBadge';
import checkIcon from '../assets/icons/check.png';

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  muted: 'bg-surface-alt text-muted',
  accent: 'border border-accent bg-accent/25 text-primary',
  project: 'border border-project bg-project/25 text-primary',
  alert: 'bg-surface-alt text-alert',
};

// Troca de emoji por PNG pixel art (pedido do Falves) - centralizado aqui em vez de em cada
// chamador (lib/statusBadge.ts, WeeklyProjectCard, WeeklyDetailPage) porque todos passam o mesmo
// literal '✅' pra "icon" - 1 mapa aqui cobre os 3 de uma vez, sem tocar em nenhum deles. Só '✅'
// tem PNG por enquanto; qualquer outro icone (🔄/⭕/🔒/▶️) continua passando direto como emoji.
const ICON_OVERRIDES: Record<string, string> = { '✅': checkIcon };

export function StatusBadge({ icon, label, tone = 'muted' }: { icon: string; label: string; tone?: StatusBadgeTone }) {
  const imgSrc = ICON_OVERRIDES[icon];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      {imgSrc ? <img src={imgSrc} alt="" className="size-3.5" aria-hidden="true" /> : <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}
