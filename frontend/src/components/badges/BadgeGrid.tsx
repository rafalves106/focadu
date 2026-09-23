import type { ReactNode } from 'react';
import type { BadgeDto } from '../../api/types';
import fireIcon from '../../assets/pixel/chama-streak.png';
import capIcon from '../../assets/pixel/capelo.png';
import flagIcon from '../../assets/pixel/bandeira.png';
import crownIcon from '../../assets/pixel/coroa.png';

// `code` vem estável do backend (calculado sob demanda, ver GetUserBadgesUseCase) - label/ícone/
// descrição são só apresentação, o frontend decide (mesmo padrão de DailyStatus -> lib/statusBadge.ts).
// `icon` aceita ReactNode (não só string) desde a troca de emoji por PNG pixel art (pedido do
// Falves) - todos os 5 badges usam sprite de assets/pixel (Figma "Focadu — Pixel Art"). Embaixador
// virou bandeira (não aperto de mãos): 2 mãos em 16×16 não ficam legíveis.
const BADGE_INFO: Record<string, { icon: ReactNode; label: string; describe: (progress: number) => string }> = {
  streak_7: { icon: <img src={fireIcon} alt="" className="size-8 pixelated" />, label: 'Chama de 7 dias', describe: (p) => `Streak recorde: ${p} dia(s)` },
  streak_30: { icon: <img src={fireIcon} alt="" className="size-8 pixelated" />, label: 'Mestre de 1 Mês', describe: (p) => `Streak recorde: ${p} dia(s)` },
  easy_weekly: { icon: <img src={capIcon} alt="" className="size-8 pixelated" />, label: 'Easy Weekly', describe: (p) => `${p}x semana(s) perfeita(s)` },
  embaixador: { icon: <img src={flagIcon} alt="" className="size-8 pixelated" />, label: 'Embaixador', describe: (p) => `${p} indicação(ões) confirmada(s)` },
  founder: { icon: <img src={crownIcon} alt="" className="size-8 pixelated" />, label: 'Founder', describe: () => 'Entre os 20 primeiros' },
};

/** Grid dos 5 badges (Fase 17) - conquistados em destaque (borda accent), resto esmaecido. Sem Figma validado ainda pra este componente. */
export function BadgeGrid({ badges }: { badges: BadgeDto[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {badges.map((badge) => {
        const info = BADGE_INFO[badge.code];
        if (!info) return null;

        return (
          <div
            key={badge.code}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
              badge.achieved ? 'border-accent bg-accent/10' : 'border-stroke bg-surface opacity-40'
            }`}
          >
            <span className="text-3xl" aria-hidden="true">
              {info.icon}
            </span>
            <p className="text-sm font-bold text-primary">{info.label}</p>
            <p className="text-xs text-secondary">{info.describe(badge.progress)}</p>
          </div>
        );
      })}
    </div>
  );
}
