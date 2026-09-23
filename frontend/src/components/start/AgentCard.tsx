import { Link } from 'react-router-dom';
import type { GamificationSummaryDto } from '../../api/types';
import gemIcon from '../../assets/pixel/gema.png';
import fireIcon from '../../assets/pixel/chama-streak.png';

const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/**
 * Cartao do agente na tela de start (23/09/2026) - o que e global, nao muda com o curso escolhido:
 * gemas (abre a loja), streak e a semana do streak em quadradinhos. A semana e derivada so do
 * `currentStreak` (os N dias seguidos terminando hoje, se ja estudou hoje, ou ontem) - dia de
 * estudo fora da sequencia atual nao aparece, o backend nao guarda esse historico.
 */
export function AgentCard({
  displayName,
  gamification,
  todayDone,
}: {
  displayName: string;
  gamification: GamificationSummaryDto;
  todayDone: boolean;
}) {
  const { currentStreak, longestStreak, totalGems } = gamification;
  const week = streakWeek(currentStreak, todayDone);
  const hint = todayDone
    ? 'Streak garantido hoje.'
    : currentStreak > 0
      ? `Estude hoje: ${currentStreak + 1} ${currentStreak + 1 === 1 ? 'dia' : 'dias'} de streak.`
      : 'Estude hoje pra começar o streak.';

  return (
    <div className="pixel-box flex shrink-0 flex-col gap-3 bg-base p-4">
      {/* Avatar e @ ja estao no menu do topo - aqui so o rotulo (sem avatar, pra tela caber sem rolar). */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-pixel-label text-[10px] text-accent">// @{displayName}</span>
        <span className="shrink-0 font-pixel-label text-[8px] text-secondary">
          Recorde {longestStreak} {longestStreak === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Fase 17: clicavel de proposito - "faz sentido clicar nele pra ir direto a loja". */}
        <Link to="/loja" className="flex items-center gap-2 border-2 border-stroke px-2.5 py-1.5 hover:border-accent" aria-label={`${totalGems} gemas - abrir a loja`}>
          <img src={gemIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
          <span className="font-pixel text-xl leading-none text-primary">{totalGems}</span>
        </Link>
        <span className={`flex items-center gap-2 border-2 px-2.5 py-1.5 ${currentStreak > 0 ? 'border-accent' : 'border-stroke'}`}>
          <img src={fireIcon} alt="" className="size-4 pixelated" aria-hidden="true" />
          <span className="font-pixel text-xl leading-none text-primary">
            {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-pixel-label text-[8px] text-secondary">Esta semana</span>
        <ol className="grid grid-cols-7 gap-1" aria-label="Dias do streak nesta semana">
          {week.map((cell, i) => (
            <li key={i} className="flex flex-col items-center gap-1" aria-label={`${WEEKDAYS[i]}: ${CELL_LABEL[cell]}`}>
              <span
                className={`aspect-square w-full max-w-6 border-2 ${
                  cell === 'streak' ? 'border-accent bg-accent' : cell === 'hoje' ? 'border-dashed border-accent' : 'border-stroke'
                }`}
              />
              <span className={`font-pixel-label text-[8px] ${cell === 'hoje' || (cell === 'streak' && i === todayIndex()) ? 'text-accent' : 'text-muted'}`}>
                {WEEKDAYS[i]}
              </span>
            </li>
          ))}
        </ol>
        <p className="font-pixel text-lg leading-tight text-secondary">{hint}</p>
      </div>
    </div>
  );
}

type Cell = 'streak' | 'hoje' | 'vazio';
const CELL_LABEL: Record<Cell, string> = { streak: 'estudou', hoje: 'hoje, ainda dá tempo', vazio: 'sem estudo' };

/** Segunda = 0 ... domingo = 6. */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function streakWeek(currentStreak: number, todayDone: boolean): Cell[] {
  const today = todayIndex();
  // Ultimo dia da sequencia: hoje (se ja estudou) ou ontem.
  const end = todayDone ? today : today - 1;
  const start = end - currentStreak + 1;
  return WEEKDAYS.map((_, i) => {
    if (currentStreak > 0 && i >= start && i <= end) return 'streak';
    if (i === today) return 'hoje';
    return 'vazio';
  });
}
