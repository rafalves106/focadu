import type { StatusBadgeIcon, StatusBadgeTone } from '../lib/statusBadge';
import checkIcon from '../assets/pixel/check.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';
import shieldIcon from '../assets/pixel/escudo.png';

const ICONS: Record<Exclude<StatusBadgeIcon, null>, string> = { check: checkIcon, lock: lockIcon, shield: shieldIcon };

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  muted: 'border-stroke text-muted',
  accent: 'border-accent text-accent',
  project: 'border-project text-project',
  alert: 'border-alert text-alert',
};

/**
 * Selo de status (Fase 8), so pixel art desde a Fase 74 (a variante arredondada e os emojis sairam):
 * caixa reta de 2px, Silkscreen e, quando houver, um sprite 16px.
 */
export function StatusBadge({ icon, label, tone = 'muted' }: { icon: StatusBadgeIcon; label: string; tone?: StatusBadgeTone }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 border-2 px-2 py-1 font-pixel-label text-[10px] ${TONE_CLASS[tone]}`}>
      {icon && <img src={ICONS[icon]} alt="" className="size-4 pixelated" aria-hidden="true" />}
      {label}
    </span>
  );
}
