import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { DailyStatus, WeeklyProjectStatus, type CourseDetailDto, type WeeklyOverviewDto } from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { WeekPath, WeekSegments } from '../components/trail/WeekPath';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FocadaLine } from '../components/ui/FocadaLine';
import { PixelIcon } from '../components/ui/PixelIcon';
import { buildFocadaMapLine, currentStop, isWeekClosurePending, pendingReinforcementOf, primaryDays, type CourseStop } from '../lib/focadaMapLines';
import { hasFinishedADay } from '../lib/startScreen';
import {
  courseDayCount,
  courseDoneDayCount,
  courseDoneToday,
  courseSizeText,
  isWeekReached,
  projectLink,
  weekLink,
  weekPathNodes,
  type PathNode,
} from '../lib/weekPath';

/**
 * Trilha (Fase 8; mapa na Fase 65; redesign v1 na Fase 109, molde Lista, Figma `18:1613`). Abas de módulo
 * (`Nav/Item`), uma linha por semana (info | Nós de dia + castelo | ação) e a legenda; à direita, o resumo
 * fixo de 400 com a fala da Focada, os números do curso e os atalhos do curso. A semana em andamento é o
 * cartão Destaque e leva o único Primário ("Continuar · Dia 3"). Abaixo de `xl` o resumo some; abaixo de
 * `lg` a coluna de ação também, e o Primário vai pro fim da tela, largura cheia no celular. A página não rola; a lista rola por dentro só
 * se o módulo não couber (último recurso).
 */
export function CourseDetailPage({ courseId }: { courseId: string }) {
  const { data: course, error, loading, retry } = useApiResource(() => api.getCourse(courseId), [courseId]);
  if (loading) return <Centered text="Carregando curso..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!course) return null;
  return <Trail course={course} />;
}

function Trail({ course }: { course: CourseDetailDto }) {
  const stop = currentStop(course);
  const doneToday = courseDoneToday(course);
  const stopModule = stop ? course.monthlies.find((m) => m.weeklies.some((w) => w.id === stop.week.id)) : null;
  const [moduleId, setModuleId] = useState(stopModule?.id ?? course.monthlies[0]?.id ?? null);
  const module = course.monthlies.find((m) => m.id === moduleId) ?? course.monthlies[0] ?? null;
  const weeks = [...(module?.weeklies ?? [])].sort((a, b) => a.number - b.number);
  const allWeeks = course.monthlies.flatMap((m) => m.weeklies);
  const practiceOnly = allWeeks.length > 0 && allWeeks.every((w) => w.isPracticeOnly);
  const focada = buildFocadaMapLine(course, new Map(course.monthlies.map((m) => [m.number, m.title])));
  const action = stop ? stopAction(course, stop, doneToday) : null;
  const here = stop?.day ? ` · você está no dia ${stop.day.dayNumber}` : '';

  return (
    <div className="tela-cheia flex gap-6 p-4 md:p-6 wide:p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6 lg:short:gap-4">
        <div className="flex shrink-0 flex-col gap-4 lg:short:gap-2">
          <Breadcrumb parts={[course.name, 'Trilha']} />
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-titulo text-primary">Trilha do curso</h1>
            <p className="hidden text-pequeno text-muted md:block">
              {courseSizeText(course)}
              {here}
            </p>
          </div>
        </div>

        {course.monthlies.length > 1 && (
          <div role="tablist" aria-label="Módulos" className="flex shrink-0 gap-2 overflow-x-auto border-b-2 border-stroke">
            {course.monthlies.map((m) => {
              const on = m.id === module?.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="trilha-modulo"
                  onClick={() => setModuleId(m.id)}
                  className={`flex shrink-0 flex-col items-center gap-2 px-4 pt-3 text-rotulo whitespace-nowrap ${on ? 'text-accent' : 'text-secondary hover:text-primary'}`}
                >
                  <span>
                    Módulo {m.number}
                    <span className="hidden md:inline"> · {m.title}</span>
                  </span>
                  <span className={`h-1 w-full ${on ? 'bg-accent' : ''}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}

        <ol id="trilha-modulo" role={course.monthlies.length > 1 ? 'tabpanel' : undefined} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto md:gap-6 lg:short:gap-4">
          {weeks.map((week) => (
            <WeekRow key={week.id} course={course} week={week} stop={stop} doneToday={doneToday} action={stop?.week.id === week.id ? action : null} />
          ))}
        </ol>

        <Legend practiceOnly={practiceOnly} />
        {action?.primary && (
          <div className="shrink-0 lg:hidden">
            <ButtonLink to={action.primary.to} className="w-full md:w-auto">
              {action.primary.label}
            </ButtonLink>
          </div>
        )}
      </div>

      <aside aria-label="Resumo do curso" className="hidden w-[400px] shrink-0 flex-col gap-6 xl:flex lg:short:gap-4">
        {focada && <FocadaLine size="devolutiva">{focada.text}</FocadaLine>}
        <CourseSummary course={course} stop={stop} practiceOnly={practiceOnly} />
        <CourseShortcuts course={course} practiceOnly={practiceOnly} />
      </aside>
    </div>
  );
}

interface StopAction {
  primary: { label: string; to: string } | null;
  /** Sem Primário: um texto ("Dia 4 abre amanhã") ou um link discreto. */
  note: string | null;
  link: { label: string; to: string } | null;
}

/** O que a semana em andamento oferece agora: continuar o Dia, abrir o projeto ou publicar. */
function stopAction(course: CourseDetailDto, stop: CourseStop, doneToday: boolean): StopAction {
  const { week, day } = stop;
  if (day) {
    if (day.status !== DailyStatus.InProgress && doneToday) return { primary: null, note: `Dia ${day.dayNumber} abre amanhã`, link: null };
    return { primary: { label: `Continuar · Dia ${day.dayNumber}`, to: `/hoje?daily=${day.id}` }, note: null, link: null };
  }
  if (week.requiresPublicationToUnlock) return { primary: { label: 'Publicar a semana', to: weekLink(course.id, week.id) }, note: null, link: null };
  if (week.projectStatus === WeeklyProjectStatus.Submitted) {
    return { primary: null, note: 'Projeto em avaliação', link: { label: 'Ver o projeto', to: projectLink(course.id, week.id) } };
  }
  return { primary: { label: 'Abrir o projeto', to: projectLink(course.id, week.id) }, note: null, link: null };
}

function isWeekDone(week: WeeklyOverviewDto): boolean {
  if (week.isPracticeOnly) return week.isClosed ?? false;
  return week.projectStatus === WeeklyProjectStatus.Evaluated && !week.requiresPublicationToUnlock;
}

function WeekRow({
  course,
  week,
  stop,
  doneToday,
  action,
}: {
  course: CourseDetailDto;
  week: WeeklyOverviewDto;
  stop: CourseStop | null;
  doneToday: boolean;
  action: StopAction | null;
}) {
  const current = action !== null;
  const days = primaryDays(week);
  const done = days.filter((d) => d.status === DailyStatus.Completed).length;
  const pending = days.find((d) => pendingReinforcementOf(week, d));
  const closed = isWeekDone(week);
  const nodes: PathNode[] = weekPathNodes(week, course.id, doneToday);
  const label = `Semana ${String(week.number).padStart(2, '0')}`;
  const meta = current
    ? [`${done} de ${days.length} dias`, pending && `reforço do Dia ${pending.dayNumber} pendente`].filter(Boolean).join(' · ')
    : closed
      ? 'Semana fechada'
      : pending
        ? `Reforço do Dia ${pending.dayNumber} pendente`
        : null;

  let side: ReactNode;
  if (current && action) {
    side = action.primary ? (
      <ButtonLink to={action.primary.to} className="w-full">
        {action.primary.label}
      </ButtonLink>
    ) : (
      <span className="flex flex-col gap-1">
        {action.note && <span className="text-pequeno text-muted">{action.note}</span>}
        {action.link && <TextLink to={action.link.to}>{action.link.label}</TextLink>}
      </span>
    );
  } else if (!isWeekReached(week)) {
    side = (
      <span className="text-pequeno text-muted">
        {week.isPracticeOnly ? `Abre quando a Semana ${week.number - 1} fechar` : `Abre com o projeto da semana ${week.number - 1}`}
      </span>
    );
  } else {
    side = <TextLink to={weekLink(course.id, week.id)}>{closed ? 'Rever a semana' : 'Ver a semana'}</TextLink>;
  }
  // Semana em andamento ainda sem Dia (stop no castelo) também é a atual.
  const highlight = current || (stop?.week.id === week.id && isWeekClosurePending(week));

  return (
    <li className="shrink-0">
      <Card
        kind={highlight ? 'destaque' : 'padrao'}
        pad="gap-3 p-3 md:gap-4 md:p-4 wide:p-6 lg:short:py-4"
        className="lg:grid lg:grid-cols-[minmax(160px,240px)_auto_minmax(160px,200px)] lg:items-center lg:gap-4 wide:gap-6"
      >
        <Link to={weekLink(course.id, week.id)} className="group flex min-w-0 flex-col gap-1">
          <span className={`text-rotulo-sm ${highlight ? 'text-accent' : 'text-secondary'}`}>{label}</span>
          <span className="truncate text-corpo text-primary group-hover:text-accent lg:whitespace-normal">{week.theme ?? week.title}</span>
          {meta && <span className="hidden text-pequeno text-muted md:block">{meta}</span>}
        </Link>
        <div className="hidden md:block">
          <WeekPath nodes={nodes} label={`Dias da ${label}`} />
        </div>
        <div className="md:hidden">
          <WeekSegments nodes={nodes} label={`Dias da ${label}`} />
        </div>
        <div className="hidden lg:block">{side}</div>
      </Card>
    </li>
  );
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-rotulo-sm text-accent hover:text-accent-hover">
      {children}
    </Link>
  );
}

/** Legenda dos Nós de dia (Figma `18:1613`), só onde sobra altura. */
function Legend({ practiceOnly }: { practiceOnly: boolean }) {
  const sample = (state: PathNode['state'], dayNumber: number | null = 1): PathNode => ({ key: state, state, label: '', dayNumber, title: '', to: null });
  const items: { node: PathNode | null; text: string }[] = [
    { node: sample('feito'), text: 'Feito' },
    { node: sample('atual'), text: 'Hoje' },
    { node: sample('trancado'), text: 'Trancado' },
    { node: sample('code'), text: 'Code comigo (6º dia)' },
    ...(practiceOnly ? [] : [{ node: sample('castelo-trancado', null), text: 'Projeto da semana' }]),
    { node: null, text: 'Reforço pendente' },
  ];
  return (
    <ul aria-hidden="true" className="hidden shrink-0 flex-wrap items-center gap-x-6 gap-y-2 lg:flex">
      {items.map(({ node, text }) => (
        <li key={text} className="flex items-center gap-2 text-rotulo-sm text-secondary">
          {node ? <LegendBox node={node} /> : <span className="size-2.5 bg-project" />}
          {text}
        </li>
      ))}
    </ul>
  );
}

const LEGEND_BOX: Partial<Record<PathNode['state'], string>> = {
  feito: 'border-accent bg-accent text-base',
  atual: 'border-accent bg-accent-tint text-accent',
  trancado: 'border-stroke bg-surface text-muted',
  code: 'border-project bg-surface text-project',
  'castelo-trancado': 'border-stroke bg-surface text-muted',
};

function LegendBox({ node }: { node: PathNode }) {
  const icon = { feito: 'check', atual: 'play', trancado: 'lock', code: 'code', 'castelo-trancado': 'castle' } as const;
  const name = icon[node.state as keyof typeof icon];
  return (
    <span className={`flex size-6 items-center justify-center border-2 ${LEGEND_BOX[node.state] ?? ''}`}>
      <PixelIcon name={name} scale={name === 'castle' ? 2 : 1} />
    </span>
  );
}

function CourseSummary({ course, stop, practiceOnly }: { course: CourseDetailDto; stop: CourseStop | null; practiceOnly: boolean }) {
  const weeks = course.monthlies.flatMap((m) => m.weeklies);
  const total = courseDayCount(course);
  const done = courseDoneDayCount(course);
  const pct = total > 0 ? Math.round((100 * done) / total) : 0;
  const projects = weeks.filter((w) => !w.isPracticeOnly);
  const projectsDone = projects.filter((w) => w.projectStatus === WeeklyProjectStatus.Evaluated).length;
  const closedWeeks = weeks.filter((w) => w.isClosed).length;
  const reinforcements = weeks.reduce((sum, w) => sum + primaryDays(w).filter((d) => pendingReinforcementOf(w, d)).length, 0);
  const remaining = stop ? primaryDays(stop.week).filter((d) => d.status !== DailyStatus.Completed).length : 0;
  const next = !stop
    ? null
    : remaining === 0
      ? `O Projeto da Semana ${stop.week.number} está aberto.`
      : practiceOnly
        ? `Faltam ${remaining} ${remaining === 1 ? 'dia' : 'dias'} pra fechar a Semana ${stop.week.number}.`
        : `Faltam ${remaining} ${remaining === 1 ? 'dia' : 'dias'} pro castelo da Semana ${stop.week.number}.`;

  return (
    <Card kind="padrao" eyebrow="Resumo do curso" className="shrink-0">
      <dl className="flex gap-8">
        <Stat value={`${done}/${total}`} label="Dias" tone="text-primary" />
        {practiceOnly ? (
          <Stat value={`${closedWeeks}/${weeks.length}`} label="Semanas" tone="text-project" />
        ) : (
          <Stat value={`${projectsDone}/${projects.length}`} label="Projetos" tone="text-project" />
        )}
        <Stat value={`${reinforcements}`} label={reinforcements === 1 ? 'Reforço' : 'Reforços'} tone={reinforcements > 0 ? 'text-project' : 'text-primary'} />
      </dl>
      <div className="h-1.5 bg-stroke" role="progressbar" aria-label="Progresso do curso" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-pequeno text-secondary">
        {pct}% do curso.{next ? ` ${next}` : ''}
      </p>
    </Card>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-rotulo-sm text-secondary">{label}</dt>
      <dd className={`text-titulo ${tone}`}>{value}</dd>
    </div>
  );
}

/**
 * "Deste curso" (Figma `18:1613`, cartão Suave): Caderninho, Certificações (curso com projeto) e Ranking
 * (depois do 1º dia, como na nav). Os subtítulos são fixos: contar notas e buscar a posição pediriam mais
 * duas chamadas só pra esta linha.
 */
function CourseShortcuts({ course, practiceOnly }: { course: CourseDetailDto; practiceOnly: boolean }) {
  const items = [
    { to: `/start?course=${course.id}&caderninho=1`, title: 'Caderninho', sub: 'Suas notas por dia' },
    ...(practiceOnly ? [] : [{ to: `/start?course=${course.id}&certifications=1`, title: 'Certificações', sub: 'O que o curso cobre' }]),
    ...(hasFinishedADay(course) ? [{ to: `/start?course=${course.id}&ranking=1`, title: 'Ranking do curso', sub: 'Sua posição na turma' }] : []),
  ];
  return (
    <Card kind="suave" eyebrow="Deste curso" className="shrink-0">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="group flex min-h-11 items-center justify-between gap-4 py-2">
              <span className="flex flex-col gap-1">
                <span className="text-corpo text-primary group-hover:text-accent">{item.title}</span>
                <span className="text-rotulo-sm text-muted">{item.sub}</span>
              </span>
              <span aria-hidden="true" className="text-corpo text-secondary group-hover:text-accent">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

