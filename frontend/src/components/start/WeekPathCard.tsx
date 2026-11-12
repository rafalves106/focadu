import { DailyStatus, WeeklyProjectStatus, type WeeklyOverviewDto } from '../../api/types';
import { primaryDays } from '../../lib/focadaMapLines';
import type { StartState } from '../../lib/startScreen';
import { weekPathNodes } from '../../lib/weekPath';
import { WeekPath, WeekSegments } from '../trail/WeekPath';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';

/**
 * "Caminho da semana" do Início (Fase 109; Figma `15:2`/`15:477`, celular `15:833`): os Nós de dia da
 * semana e o castelo do Projeto da semana. No celular vira segmentos. Embaixo, o reforço pendente (Chip
 * âmbar, quando o Destaque não é ele) e uma frase sobre o que vem.
 */
export function WeekPathCard({
  week,
  courseId,
  state,
  doneToday,
}: {
  week: WeeklyOverviewDto;
  courseId: string;
  state: StartState;
  doneToday: boolean;
}) {
  const days = primaryDays(week);
  const remaining = days.filter((d) => d.status !== DailyStatus.Completed).length;
  const nodes = weekPathNodes(week, courseId, doneToday);
  const label = `Dias da Semana ${week.number}`;
  const bridge = days.find((d) => d.isBridge && d.status !== DailyStatus.Completed);
  const showChip = state.reinforcement && state.highlight.kind !== 'reforco';

  const title = week.isPracticeOnly
    ? remaining > 0
      ? `Faltam ${remaining} ${remaining === 1 ? 'dia' : 'dias'} para fechar a semana`
      : 'Semana fechada'
    : remaining > 0
      ? `Faltam ${remaining} ${remaining === 1 ? 'dia' : 'dias'} para o Projeto da semana`
      : week.projectStatus === WeeklyProjectStatus.Evaluated
        ? 'Projeto da semana avaliado'
        : 'Projeto da semana aberto';

  const note = state.firstDay
    ? `${days.length} dias e, no fim, ${week.isPracticeOnly ? 'o code comigo fecha a semana' : 'o Projeto da semana'}. Um dia por vez.`
    : [
        // Na prévia de amanhã o Destaque já diz isso.
        state.tomorrow && state.highlight.kind === 'reforco' ? `Dia ${state.tomorrow.dayNumber} abre amanhã.` : null,
        bridge
          ? week.isPracticeOnly
            ? `O ${days.length}º dia é o code comigo: um script com o que você viu. Depois dele, a semana fecha.`
            : `O ${days.length}º dia é o code comigo: um script com o que você viu. Depois dele, o castelo abre.`
          : null,
      ]
        .filter(Boolean)
        .join(' ');

  return (
    <Card kind="padrao" eyebrow="Caminho da semana" title={title} pad="gap-4 p-4 md:p-6" className="shrink-0">
      <div className="hidden md:block">
        <WeekPath nodes={nodes} label={label} fill />
      </div>
      <div className="md:hidden">
        <WeekSegments nodes={nodes} label={label} />
      </div>
      {(showChip || note) && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          {showChip && state.reinforcement && (
            <Chip tone="ambar">Reforço{state.reinforcement.dayNumber ? ` do Dia ${state.reinforcement.dayNumber}` : ''} pendente</Chip>
          )}
          {note && <p className="text-pequeno text-secondary">{note}</p>}
        </div>
      )}
    </Card>
  );
}
