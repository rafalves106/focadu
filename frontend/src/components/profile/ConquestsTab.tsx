import type { BadgeDto } from '../../api/types';
import { knownBadges } from '../../lib/badgeInfo';
import { SegmentedBar } from '../SegmentedBar';
import { Section } from './Section';
import checkIcon from '../../assets/pixel/check.png';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';

/**
 * Aba "Conquistas" do Perfil (Fase 18; pixel art na Fase 70) - cada badge vira uma linha com a barra
 * em blocos ate a meta (regras do backend, ver lib/badgeInfo.ts). Trancadas mostram o que falta. O
 * cartao "Indique um amigo" (era desta aba) foi pra coluna direita do perfil, sempre visivel.
 */
export function ConquestsTab({ badges }: { badges: BadgeDto[] }) {
  const shown = knownBadges(badges);
  const achieved = shown.filter((b) => b.badge.achieved).length;

  return (
    <Section title="Badges" aside={<span className="font-pixel-label text-[9px] text-muted">{achieved} de {shown.length} conquistadas</span>}>
      <ul className="flex flex-col gap-3">
        {shown.map(({ badge, info }) => {
          const ok = badge.achieved;
          const goal = info.goal;
          const percentage = ok ? 100 : goal ? (Math.min(badge.progress, goal) / goal) * 100 : 0;
          return (
            <li key={badge.code} className={`flex items-center gap-4 border-2 px-3.5 py-3 ${ok ? 'border-accent' : 'border-stroke'}`}>
              <span className={`flex size-14 shrink-0 items-center justify-center border-2 ${ok ? 'border-accent/60 bg-surface' : 'border-stroke'}`}>
                <img src={info.icon} alt="" className={`size-8 pixelated ${ok ? '' : 'opacity-35'}`} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className={`font-pixel-label text-xs ${ok ? 'text-primary' : 'text-secondary'}`}>{info.label}</p>
                <p className={`font-pixel text-[19px] leading-tight ${ok ? 'text-secondary' : 'text-muted'}`}>{info.description}</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-32 sm:w-44">
                    <SegmentedBar percentage={percentage} label={`Progresso: ${info.label}`} segments={10} heightClass="h-2" tone={ok ? 'bg-accent' : 'bg-project'} />
                  </div>
                  <span className={`font-pixel-label text-[8px] ${ok ? 'text-accent' : 'text-project'}`}>
                    {ok ? 'Completo' : goal ? `${Math.min(badge.progress, goal)}/${goal}` : '0/1'}
                  </span>
                </div>
              </div>
              <span
                className={`hidden shrink-0 items-center gap-1.5 border-2 px-2.5 py-1.5 font-pixel-label text-[8px] sm:flex ${
                  ok ? 'border-accent/60 text-accent' : 'border-stroke text-secondary'
                }`}
              >
                <img src={ok ? checkIcon : lockIcon} alt="" className="size-4 pixelated" />
                {ok ? 'Conquistada' : info.missing(badge.progress)}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
