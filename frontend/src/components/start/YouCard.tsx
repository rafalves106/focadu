import type { GamificationSummaryDto } from '../../api/types';
import { WEEKDAYS, formatDayMonth, streakWeek, todayIndex } from '../../lib/startScreen';
import { Card } from '../ui/Card';

/**
 * Cartão "Você" do Início (Fase 109; Figma `15:423`): sequência, gems e quantos Dias da semana do curso
 * já foram feitos, mais a semana da sequência em quadrados de 20 (hoje com contorno verde). Some no 1º
 * dia: sequência e gems só aparecem depois que acontecem (sistema.md regra 5).
 */
export function YouCard({
  gamification,
  todayDone,
  weekDone,
  weekTotal,
}: {
  gamification: GamificationSummaryDto;
  todayDone: boolean;
  weekDone: number;
  weekTotal: number;
}) {
  const { currentStreak, totalGems, streakPausedUntil, streakRestAvailable } = gamification;
  const cells = streakWeek(currentStreak, todayDone);
  const today = todayIndex();
  const note = streakPausedUntil
    ? `Sequência pausada até ${formatDayMonth(streakPausedUntil)}: o Projeto da semana está aberto.`
    : streakRestAvailable
      ? 'Folga livre: 1 dia sem estudar não quebra a sequência.'
      : 'Folga usada: ela volta 7 dias depois.';

  return (
    <Card kind="padrao" eyebrow="Você" className="shrink-0">
      <dl className="flex gap-8">
        <Stat value={currentStreak} label={currentStreak === 1 ? 'Dia seguido' : 'Dias seguidos'} tone="text-project" />
        <Stat value={totalGems} label="Gems" tone="text-accent" />
        {weekTotal > 0 && <Stat value={`${weekDone}/${weekTotal}`} label="Esta semana" tone="text-primary" />}
      </dl>
      <ol className="flex gap-2" aria-label="Dias da sequência nesta semana">
        {cells.map((cell, i) => (
          <li key={i} className="flex flex-col items-center gap-1" aria-label={`${WEEKDAYS[i]}: ${CELL_TEXT[cell]}`}>
            <span
              className={`size-5 border-2 ${cell === 'estudou' ? 'border-stroke bg-accent' : cell === 'hoje' ? 'border-accent bg-surface' : 'border-stroke bg-surface'}`}
            />
            <span className={`text-rotulo-sm ${i === today ? 'text-accent' : 'text-muted'}`}>{WEEKDAYS[i]}</span>
          </li>
        ))}
      </ol>
      <p className="text-pequeno text-muted">{note}</p>
    </Card>
  );
}

const CELL_TEXT = { estudou: 'estudou', hoje: 'hoje, ainda dá tempo', vazio: 'sem estudo' } as const;

function Stat({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-rotulo-sm text-secondary">{label}</dt>
      <dd className={`text-titulo ${tone}`}>{value}</dd>
    </div>
  );
}
