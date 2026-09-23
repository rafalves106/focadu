import type { StatusBadgeTone } from '../lib/statusBadge';
import checkIcon from '../assets/pixel/check.png';
import lockIcon from '../assets/pixel/cadeado-bloqueado.png';
import shieldIcon from '../assets/pixel/escudo.png';

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  muted: 'bg-surface-alt text-muted',
  accent: 'border border-accent bg-accent/25 text-primary',
  project: 'border border-project bg-project/25 text-primary',
  alert: 'bg-surface-alt text-alert',
};

// Troca de emoji por PNG pixel art (pedido do Falves) - centralizado aqui em vez de em cada
// chamador (lib/statusBadge.ts, WeeklyProjectCard, WeeklyDetailPage) porque todos passam o mesmo
// literal pra "icon" - 1 mapa aqui cobre todos de uma vez, sem tocar em nenhum deles. '✅', '🔒'
// (semana/dia bloqueado) e '🛡️' (certificacoes, com e sem o seletor de variacao U+FE0F) tem PNG;
// qualquer outro icone (🔄/⭕/▶️) continua passando direto como emoji.
const ICON_OVERRIDES: Record<string, string> = { '✅': checkIcon, '🔒': lockIcon, '🛡️': shieldIcon, '🛡': shieldIcon };

// `pixel` (tela de start, 23/09/2026): mesma linguagem dos cartoes da trilha - caixa reta com borda de
// 2px, Silkscreen, e so sprite (emoji sem PNG fica de fora, nao combina com a pixel art).
const PIXEL_TONE_CLASS: Record<StatusBadgeTone, string> = {
  muted: 'border-stroke text-muted',
  accent: 'border-accent text-accent',
  project: 'border-project text-project',
  alert: 'border-alert text-alert',
};

export function StatusBadge({
  icon,
  label,
  tone = 'muted',
  pixel = false,
}: {
  icon: string;
  label: string;
  tone?: StatusBadgeTone;
  pixel?: boolean;
}) {
  const imgSrc = ICON_OVERRIDES[icon];

  if (pixel) {
    return (
      <span className={`inline-flex shrink-0 items-center gap-1.5 border-2 px-2 py-1 font-pixel-label text-[10px] ${PIXEL_TONE_CLASS[tone]}`}>
        {imgSrc && <img src={imgSrc} alt="" className="size-4 pixelated" aria-hidden="true" />}
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      {imgSrc ? <img src={imgSrc} alt="" className="size-3.5" aria-hidden="true" /> : <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}
