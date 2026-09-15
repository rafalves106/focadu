import type { ReactNode } from 'react';
import type { BadgeDto } from '../../api/types';
import fireIcon from '../../assets/icons/fire.png';

// `code` vem estável do backend (calculado sob demanda, ver GetUserBadgesUseCase) - label/ícone/
// descrição são só apresentação, o frontend decide (mesmo padrão de DailyStatus -> lib/statusBadge.ts).
// `icon` aceita ReactNode (não só string) desde a troca de emoji por PNG pixel art (pedido do
// Falves, mesmo arquivo fire.png de StreakIndicator/StreakLostModal) - só os 2 badges de streak
// ganharam PNG; easy_weekly/embaixador/founder continuam emoji (sem asset próprio ainda).
const BADGE_INFO: Record<string, { icon: ReactNode; label: string; describe: (progress: number) => string }> = {
  streak_7: { icon: <img src={fireIcon} alt="" className="size-8" />, label: 'Chama de 7 dias', describe: (p) => `Streak recorde: ${p} dia(s)` },
  streak_30: { icon: <img src={fireIcon} alt="" className="size-8" />, label: 'Mestre de 1 Mês', describe: (p) => `Streak recorde: ${p} dia(s)` },
  easy_weekly: { icon: '🎓', label: 'Easy Weekly', describe: (p) => `${p}x semana(s) perfeita(s)` },
  embaixador: { icon: '🤝', label: 'Embaixador', describe: (p) => `${p} indicação(ões) confirmada(s)` },
  founder: { icon: '👑', label: 'Founder', describe: () => 'Entre os 20 primeiros' },
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
