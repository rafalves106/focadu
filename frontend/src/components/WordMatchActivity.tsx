import { useState } from 'react';
import { ActivityStatus, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { ActivityScreen } from './Layout';
import { IntroCard } from './activities/IntroCard';
import { OptionsAnswer } from './OptionsAnswer';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

/**
 * Ligar Palavras (Fase 9, design Figma "Ligar 1-6") - todas as DailyActivity WordMatch da Daily
 * formam, juntas, 1 exercicio de associacao - 1 termo por atividade (decisao de modelagem da Fase
 * 4, ver docs/ARQUITETURA.md). Extraido de TodayPage.renderStep (Fase 9) pra caber a Intro e o
 * progresso "X de Y termos" sem inchar o step machine.
 *
 * O Figma mostra 2 colunas com conectores visuais entre os pares (drag-and-drop) - o dominio
 * responde cada termo como uma escolha independente (1 termo = 1 mini card de opcoes, ver
 * OptionsAnswer), nao como um grafo de pares arrastaveis. Reconstruir a interacao de arrastar como
 * no mockup e um paradigma de interacao novo, fora do escopo de "polimento visual" desta fase -
 * mantido o mecanismo existente (unico coberto pelos testes e pelo backend), so com o visual/
 * progresso uniformizados.
 */
export function WordMatchActivity({
  group,
  dailyId,
  onDailyRefetched,
  onContinue,
}: {
  group: DailyActivityDto[];
  dailyId: string;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [started, setStarted] = useState(group.some((a) => a.status === ActivityStatus.Completed));

  const answeredCount = group.filter((a) => a.status === ActivityStatus.Completed).length;
  const allAnswered = answeredCount === group.length;
  const isLastPending = group.length - answeredCount === 1;

  if (!started) {
    return (
      <IntroCard
        badge="Ligar palavras"
        title="Associe os termos"
        description={`Escolha a definição certa para cada um dos ${group.length} termos.`}
        rules={['1 tentativa por termo.', 'Cada termo pontua de forma independente.']}
        ctaLabel="COMEÇAR"
        onStart={() => setStarted(true)}
      />
    );
  }

  return (
    <ActivityScreen eyebrow="Associe os termos" title="Escolha a definição certa para cada termo.">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-secondary">
          <span>
            {answeredCount} de {group.length} termos conectados
          </span>
          {!allAnswered && isLastPending && <StatusBadge icon="⏳" label="ÚLTIMO TERMO" tone="project" />}
        </div>
        <ProgressBar progress={group.length ? answeredCount / group.length : 0} />
      </div>

      <div className="flex flex-col gap-8">
        {group.map((activity) => (
          <div key={activity.id}>
            <h2 className="mb-3 text-lg font-semibold text-primary">{activity.prompt}</h2>
            <OptionsAnswer dailyId={dailyId} activity={activity} onDailyRefetched={onDailyRefetched} />
          </div>
        ))}
      </div>

      {allAnswered && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl border border-surface-alt bg-surface px-4 py-3.5 text-sm font-bold tracking-wide text-primary hover:border-accent"
        >
          CONTINUAR
        </button>
      )}
    </ActivityScreen>
  );
}
