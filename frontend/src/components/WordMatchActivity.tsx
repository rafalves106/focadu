import { useState } from 'react';
import { ActivityStatus, type DailyActivityDto, type DailyStateDto } from '../api/types';
import { IntroCard } from './activities/IntroCard';
import { OptionsAnswer } from './OptionsAnswer';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';
import { SessionLayout } from './SessionShell';
import { useMaterialSidebar } from './useMaterialSidebar';

/**
 * Ligar Palavras (Fase 9, design Figma "Ligar 1-6" - fidelidade revisada na Fase 19, node
 * "sessao-ligar-palavras") - todas as DailyActivity WordMatch da Daily formam, juntas, 1 exercicio
 * de associacao - 1 termo por atividade (decisao de modelagem da Fase 4, ver docs/ARQUITETURA.md).
 * Extraido de TodayPage.renderStep (Fase 9) pra caber a Intro e o progresso "X de Y termos" sem
 * inchar o step machine.
 *
 * O Figma mostra 2 colunas com conectores visuais entre os pares (drag-and-drop) - o dominio
 * responde cada termo como uma escolha independente (1 termo = 1 mini card de opcoes, ver
 * OptionsAnswer), nao como um grafo de pares arrastaveis. Reconstruir a interacao de arrastar como
 * no mockup e um paradigma de interacao novo, fora do escopo de "polimento visual" desta fase -
 * mantido o mecanismo existente (unico coberto pelos testes e pelo backend), so com o visual/
 * progresso uniformizados (inclusive nesta fase: cores/tipografia/cartao, mesmo mecanismo).
 */
export function WordMatchActivity({
  group,
  dailyId,
  daily,
  onDailyRefetched,
  onContinue,
}: {
  group: DailyActivityDto[];
  dailyId: string;
  daily: DailyStateDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [started, setStarted] = useState(group.some((a) => a.status === ActivityStatus.Completed));
  const { weekly, sidebar } = useMaterialSidebar(daily);

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

  const sortedActivities = [...daily.activities].sort((a, b) => a.orderIndex - b.orderIndex);
  const stepIndex = sortedActivities.findIndex((a) => a.id === group[0]?.id);
  const total = sortedActivities.length;

  return (
    <SessionLayout
      eyebrow={(weekly?.theme ?? weekly?.title ?? '').toUpperCase()}
      stepLabel={`ETAPA ${stepIndex + 1} DE ${total} — LIGAR PALAVRAS`}
      progress={(stepIndex + 1) / total}
      sidebar={sidebar}
    >
      <div className="flex flex-col gap-2">
        <p className="text-[22px] font-semibold leading-[1.3] text-primary">Conecte cada termo à sua definição</p>
        <div className="flex items-center gap-2 text-xs text-secondary">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {answeredCount} de {group.length} termos conectados
          {!allAnswered && isLastPending && (
            <span className="ml-1">
              <StatusBadge icon="⏳" label="ÚLTIMO TERMO" tone="project" />
            </span>
          )}
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
          className="rounded-xl bg-accent py-4 text-sm font-semibold tracking-[1px] text-base"
        >
          CONFIRMAR RESPOSTA
        </button>
      )}
    </SessionLayout>
  );
}
