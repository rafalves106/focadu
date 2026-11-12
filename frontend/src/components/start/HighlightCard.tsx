import type { ReactNode } from 'react';
import { DailyAccessMode, DailyStatus, type CourseDetailDto } from '../../api/types';
import {
  DAY_GEMS,
  REINFORCEMENT_GEMS,
  describeActivities,
  stepProgress,
  type StartState,
} from '../../lib/startScreen';
import { courseDayCount, projectLink, weekLink } from '../../lib/weekPath';
import { ButtonLink } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * Cartão Destaque do Início (Fase 109; Figma `15:2` dia por fazer, `15:477` dia feito, `15:833` 1º dia):
 * o único Primário da tela. Com Dia pra fazer, é o Dia; sem, é a pendência mais importante (reforço >
 * projeto aberto > publicação pendente > prévia de amanhã, essa sem Primário). Embaixo do Primário, um
 * Pequeno apagado diz o que vem depois.
 */
export function HighlightCard({
  course,
  state,
  streak,
  studied,
}: {
  course: CourseDetailDto;
  state: StartState;
  streak: number;
  studied: boolean;
}) {
  const h = state.highlight;
  const total = courseDayCount(course);
  const tomorrow = state.tomorrow ? `Amanhã: Dia ${state.tomorrow.dayNumber}${state.tomorrow.title ? ` · ${state.tomorrow.title}` : ''}` : null;
  const doneEyebrow = state.doneToday
    ? `Dia ${state.doneToday.dayNumber} feito · +${DAY_GEMS} gem · ${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}`
    : null;

  switch (h.kind) {
    case 'dia': {
      const { daily } = h;
      const resuming = daily.status === DailyStatus.InProgress;
      const replay = daily.accessMode === DailyAccessMode.Replay || daily.status === DailyStatus.Completed;
      const step = stepProgress(daily);
      const after = resuming
        ? `Você parou na etapa ${step.at} de ${step.total}.`
        : replay || state.firstDay
          ? null
          : !studied && streak > 0
            ? `Vale +${DAY_GEMS} gem e mantém a sequência de ${streak} ${streak === 1 ? 'dia' : 'dias'}.`
            : `Vale +${DAY_GEMS} gem.`;
      return (
        <Highlight
          eyebrow={`Hoje · Dia ${daily.dayNumber}${total > 0 ? ` de ${total}` : ''}`}
          title={h.title ?? `Dia ${daily.dayNumber}`}
          text={describeActivities(daily.activities)}
          action={
            <ButtonLink to={`/hoje?daily=${daily.id}`} className="w-full md:w-auto">
              {replay ? 'Rever o dia' : resuming ? 'Continuar o dia' : 'Começar o dia'}
            </ButtonLink>
          }
          after={after}
          afterInline
        />
      );
    }
    case 'reforco': {
      const { reinforcement: r } = h;
      const from = r.dayNumber ? ` do Dia ${r.dayNumber}` : '';
      const what = r.activityCount ? `Só ${r.activityCount === 1 ? 'a atividade que escapou' : `as ${r.activityCount} atividades que escaparam`}` : 'Só o que escapou';
      return (
        <Highlight
          eyebrow={doneEyebrow ?? 'Pendência'}
          title={`Um reforço${from} te espera`}
          text={`${what}. Não gasta o dia de amanhã e vale +${REINFORCEMENT_GEMS} gems se acertar tudo.`}
          action={
            <>
              <ButtonLink to={`/hoje?daily=${r.id}`} className="w-full md:w-auto">
                Fazer o reforço
              </ButtonLink>
              {state.doneToday && (
                <ButtonLink kind="secundario" to={`/hoje?daily=${state.doneToday.id}`} className="w-full md:w-auto">
                  Rever o Dia {state.doneToday.dayNumber}
                </ButtonLink>
              )}
            </>
          }
          after={tomorrow}
        />
      );
    }
    case 'projeto':
      return h.submitted ? (
        <Highlight
          eyebrow={doneEyebrow ?? `Semana ${h.week.number} · Projeto`}
          title="Projeto em avaliação"
          text="A IA está lendo o seu repositório. A nota aparece no Projeto da semana e libera a próxima semana."
          action={
            <ButtonLink kind="secundario" to={projectLink(course.id, h.week.id)} className="w-full md:w-auto">
              Ver o projeto
            </ButtonLink>
          }
          after={null}
        />
      ) : (
        <Highlight
          eyebrow={doneEyebrow ?? `Semana ${h.week.number} · Projeto`}
          title={`O Projeto da Semana ${h.week.number} abriu`}
          text={`Os dias da semana estão feitos. Agora é código seu: a Semana ${h.week.number + 1} abre com o projeto avaliado.`}
          action={
            <ButtonLink to={projectLink(course.id, h.week.id)} className="w-full md:w-auto">
              Abrir o projeto
            </ButtonLink>
          }
          after={null}
        />
      );
    case 'publicacao':
      return (
        <Highlight
          eyebrow={doneEyebrow ?? `Semana ${h.week.number} · Publicação`}
          title={`Falta publicar a Semana ${h.week.number}`}
          text={`A Focada escreve o post com o que você estudou e o projeto entregue. Publicou no LinkedIn, a Semana ${h.week.number + 1} abre.`}
          action={
            <ButtonLink to={weekLink(course.id, h.week.id)} className="w-full md:w-auto">
              Publicar a semana
            </ButtonLink>
          }
          after={null}
        />
      );
    case 'amanha':
      return (
        <Highlight
          eyebrow={doneEyebrow ?? 'Hoje'}
          title="Por hoje acabou"
          text={tomorrow ? `${tomorrow}.` : 'O próximo Dia abre amanhã.'}
          action={null}
          after={null}
        />
      );
    case 'concluido':
      return (
        <Highlight
          eyebrow={course.name}
          title="Curso concluído"
          text="Todos os dias e projetos estão feitos. A trilha guarda tudo pra você rever quando quiser."
          action={
            <ButtonLink to={`/start?course=${course.id}`} className="w-full md:w-auto">
              Ver a trilha
            </ButtonLink>
          }
          after={null}
        />
      );
  }
}

function Highlight({
  eyebrow,
  title,
  text,
  action,
  after,
  afterInline = false,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action: ReactNode;
  after: string | null;
  /** Desktop: o "depois" ao lado do Primário (dia por fazer) em vez de embaixo. */
  afterInline?: boolean;
}) {
  return (
    <Card kind="destaque" eyebrow={eyebrow} title={title} pad="gap-4 p-4 md:p-6" className="shrink-0">
      <p className="text-corpo text-secondary">{text}</p>
      {(action || after) && (
        <div className={`flex flex-col gap-4 ${afterInline ? 'md:flex-row md:items-center' : ''}`}>
          {action && <div className="flex flex-col gap-4 md:flex-row">{action}</div>}
          {after && <p className="text-pequeno text-muted">{after}</p>}
        </div>
      )}
    </Card>
  );
}
