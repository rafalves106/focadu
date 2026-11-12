import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import {
  DailyStatus,
  PROJECT_LANGUAGE_NAMES,
  WeeklyProjectStatus,
  type CourseDetailDto,
  type DailyOverviewDto,
  type WeeklyDetailDto,
  type WeeklyOverviewDto,
} from '../api/types';
import { Centered } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { PublicationModal } from '../components/publication/PublicationModal';
import { DayNode } from '../components/trail/DayNode';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { FocadaLine } from '../components/ui/FocadaLine';
import { buildFocadaWeekLine, pendingReinforcementOf, primaryDays } from '../lib/focadaMapLines';
import { courseDoneToday, projectLink, type DayNodeState, type PathNode } from '../lib/weekPath';

/**
 * Visão da semana (Fase 8; pixel art na Fase 74; redesign v1 na Fase 109, molde Lista, Figma `28:1242`,
 * celular `34:2136`). Uma linha por Dia (Nó de dia, título, "k/n aprovadas", Chip âmbar de reforço
 * pendente) e, no fim, o castelo do Projeto da semana. À direita (a partir de `xl`), o resumo de 400: fala
 * da Focada, números da semana, publicação pendente e o projeto. O único Primário é o do Dia atual, o do
 * projeto aberto ou o de publicar; abaixo de `lg` ele vai pro fim da tela, largura cheia. Reforço
 * pendente é âmbar, nunca vermelho, e os erros da semana não aparecem em número. A página não rola.
 *
 * Dados: GET /api/weeklies/{id} + GET /api/courses/{id} (reforço por Dia, "feito hoje" e a semana vista
 * pelo curso). Sem `course` na URL, o reforço por Dia some sem quebrar a tela.
 */
export function WeeklyDetailPage({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const { data: weekly, error, loading, retry } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId]);
  const { data: course } = useApiResource(() => (courseId ? api.getCourse(courseId) : Promise.resolve(null)), [courseId]);
  const [showPublicationModal, setShowPublicationModal] = useState(false);

  if (loading) return <Centered text="Carregando semana..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const allWeeks = course?.monthlies.flatMap((m) => m.weeklies) ?? [];
  const index = allWeeks.findIndex((w) => w.id === weeklyId);
  const overview = index >= 0 ? allWeeks[index] : null;
  const hasNext = !course || index < allWeeks.length - 1;
  const cid = courseId ?? weekly.courseId;
  const rows = dayRows(weekly, overview, course);
  const project = weekly.isPracticeOnly ? null : projectRow(weekly, cid);
  const current = rows.find((r) => r.node.state === 'atual') ?? null;
  // O único Primário: o Dia de agora, senão o projeto aberto. Publicar mora no cartão âmbar.
  const primary: { label: string; to: string } | null = current
    ? { label: `${current.day.status === DailyStatus.InProgress ? 'Continuar' : 'Começar'} · Dia ${current.day.dayNumber}`, to: `/hoje?daily=${current.day.id}` }
    : project?.open && !weekly.requiresPublicationToUnlock
      ? { label: 'Abrir o projeto', to: projectLink(cid, weekly.id) }
      : null;
  const focada = buildFocadaWeekLine(weekly, overview, hasNext);
  const publish = weekly.requiresPublicationToUnlock ? <PublishCard week={weekly.number} onPublish={() => setShowPublicationModal(true)} /> : null;
  const theme = weekly.theme ?? weekly.title;

  return (
    <div className="tela-cheia flex gap-6 p-4 md:p-6 wide:p-8">
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:short:gap-3">
        <div className="flex shrink-0 flex-col gap-4 lg:short:gap-2">
          <Breadcrumb parts={[course?.name, course && { label: 'Trilha', to: `/start?course=${cid}` }, `Semana ${weekly.number}`]} />
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="text-lead text-primary md:text-titulo">
              <span className="hidden md:inline">Semana {weekly.number} · </span>
              {theme}
            </h1>
            <p className="hidden text-pequeno text-muted md:block">
              {rows.length} dias {weekly.isPracticeOnly ? 'e o code comigo fecha a semana' : 'e o Projeto da semana'}
            </p>
          </div>
        </div>

        {publish && <div className="shrink-0 xl:hidden">{publish}</div>}

        <ol className="flex min-h-0 flex-col gap-2 overflow-y-auto md:gap-4 lg:short:gap-2">
          {rows.map((row) => (
            <DayRow key={row.day.id} row={row} primary={row === current ? primary : null} />
          ))}
          {project && <ProjectRow row={project} primary={!current ? primary : null} />}
        </ol>

        {primary && (
          <div className="shrink-0 lg:hidden">
            <ButtonLink to={primary.to} className="w-full md:w-auto">
              {primary.label}
            </ButtonLink>
          </div>
        )}
      </div>

      <aside aria-label="Resumo da semana" className="hidden w-[400px] shrink-0 flex-col gap-6 xl:flex lg:short:gap-4">
        <FocadaLine size="devolutiva">{focada.text}</FocadaLine>
        <WeekSummary weekly={weekly} rows={rows} />
        {publish}
        {project && <ProjectCard weekly={weekly} />}
      </aside>

      {showPublicationModal && (
        <PublicationModal
          weeklyId={weeklyId}
          courseId={courseId}
          // retry() só ao fechar (não durante o fluxo): useApiResource.retry() mostra "Carregando semana..." e
          // desmontaria o modal no meio do passo a passo. Ver o comentário de PublicationModal.
          onClose={() => {
            setShowPublicationModal(false);
            retry();
          }}
        />
      )}
    </div>
  );
}

interface DayRowData {
  day: DailyOverviewDto;
  node: PathNode;
  /** Daily de reforço ainda aberta, nascida deste Dia. */
  reinforcementId: string | null;
  bridge: boolean;
  language: string | null;
  previous: number | null;
}

function dayRows(weekly: WeeklyDetailDto, overview: WeeklyOverviewDto | null, course: CourseDetailDto | null): DayRowData[] {
  const days = weekly.dailies.filter((d) => !d.isReinforcement).sort((a, b) => a.dayNumber - b.dayNumber);
  const doneToday = course ? courseDoneToday(course) : false;
  const locked = overview?.isLocked ?? false;
  const projectLanguage = weekly.project?.language ? PROJECT_LANGUAGE_NAMES[weekly.project.language] : null;
  return days.map((day, i) => {
    const summary = overview ? (primaryDays(overview).find((d) => d.id === day.id) ?? null) : null;
    const reinforcement = overview && summary ? pendingReinforcementOf(overview, summary) : null;
    let state: DayNodeState;
    if (day.status === DailyStatus.Completed) state = reinforcement ? 'feito-reforco' : 'feito';
    else if (day.status === DailyStatus.InProgress) state = 'atual';
    else if (day.isNext && !locked) state = doneToday ? 'disponivel' : 'atual';
    else state = day.isBridge ? 'code' : 'trancado';
    return {
      day,
      node: {
        key: day.id,
        state,
        label: `D${day.dayNumber}`,
        dayNumber: day.dayNumber,
        title: `Dia ${day.dayNumber}`,
        to: state === 'feito' || state === 'feito-reforco' || state === 'atual' ? `/hoje?daily=${day.id}` : null,
      },
      reinforcementId: reinforcement?.id ?? null,
      bridge: day.isBridge ?? false,
      language: projectLanguage ?? weekly.practiceLanguage ?? null,
      previous: i > 0 ? days[i - 1].dayNumber : null,
    };
  });
}

function DayRow({ row, primary }: { row: DayRowData; primary: { label: string; to: string } | null }) {
  const { day, node } = row;
  const done = node.state === 'feito' || node.state === 'feito-reforco';
  const current = node.state === 'atual';
  const step = Math.min(day.completedActivities + 1, day.totalActivities);
  const meta = done
    ? `${day.passedActivities}/${day.totalActivities} aprovadas`
    : current
      ? day.status === DailyStatus.InProgress
        ? `Etapa ${step} de ${day.totalActivities} · ${day.passedActivities} ${day.passedActivities === 1 ? 'aprovada' : 'aprovadas'} até agora`
        : `${day.totalActivities} etapas`
      : node.state === 'disponivel'
        ? 'Abre amanhã'
        : row.previous !== null && !row.bridge
          ? `Abre depois do Dia ${row.previous}`
          : null;
  const title = day.title ?? `Dia ${day.dayNumber}`;

  let side: ReactNode = null;
  if (row.reinforcementId) {
    side = (
      <ButtonLink kind="secundario" to={`/hoje?daily=${row.reinforcementId}`} className="w-full">
        Fazer o reforço
      </ButtonLink>
    );
  } else if (primary) {
    side = (
      <ButtonLink to={primary.to} className="w-full">
        {primary.label}
      </ButtonLink>
    );
  } else if (done) {
    side = <TextLink to={`/hoje?daily=${day.id}`}>Rever o dia</TextLink>;
  }

  return (
    <Row highlight={current} node={node} side={side}>
      {node.to ? (
        <Link to={node.to} className={`truncate text-corpo hover:text-accent md:text-lead ${done || current ? 'text-primary' : 'text-secondary'}`}>
          {title}
        </Link>
      ) : (
        <span className="truncate text-corpo text-secondary md:text-lead">{title}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {row.bridge && (
          <span className="text-rotulo-sm text-project md:text-pequeno md:normal-case md:tracking-normal">
            code comigo{row.language ? ` · em ${row.language}` : ''}
          </span>
        )}
        {meta && <span className="text-rotulo-sm text-muted md:text-pequeno md:normal-case md:tracking-normal">{meta}</span>}
        {node.state === 'feito-reforco' && <Chip tone="ambar">Reforço pendente</Chip>}
      </span>
    </Row>
  );
}

interface ProjectRowData {
  node: PathNode;
  status: WeeklyProjectStatus | null;
  open: boolean;
  score: number | null;
  to: string;
}

function projectRow(weekly: WeeklyDetailDto, courseId: string): ProjectRowData {
  const days = weekly.dailies.filter((d) => !d.isReinforcement);
  const open = days.length > 0 && days.every((d) => d.status === DailyStatus.Completed);
  const status = weekly.project?.status ?? null;
  const to = projectLink(courseId, weekly.id);
  return {
    node: { key: 'projeto', state: open ? 'castelo-aberto' : 'castelo-trancado', label: 'Projeto', dayNumber: null, title: 'Projeto da semana', to },
    status,
    open: open && status !== WeeklyProjectStatus.Submitted && status !== WeeklyProjectStatus.Evaluated,
    score: weekly.project?.score ?? null,
    to,
  };
}

function ProjectRow({ row, primary }: { row: ProjectRowData; primary: { label: string; to: string } | null }) {
  const meta =
    row.status === WeeklyProjectStatus.Evaluated
      ? `Avaliado${row.score !== null ? `: ${row.score}/100` : ''}`
      : row.status === WeeklyProjectStatus.Submitted
        ? 'Entregue, em avaliação'
        : row.open
          ? 'Aberto: a próxima semana abre com ele avaliado'
          : 'Abre quando o code comigo fechar';
  const side = primary ? (
    <ButtonLink to={primary.to} className="w-full">
      {primary.label}
    </ButtonLink>
  ) : row.status !== null && row.status !== WeeklyProjectStatus.Pending ? (
    <TextLink to={row.to}>Ver o projeto</TextLink>
  ) : null;
  return (
    <Row highlight={false} node={row.node} side={side}>
      <Link to={row.to} className="truncate text-corpo text-secondary hover:text-accent md:text-lead">
        Projeto da semana
      </Link>
      <span className="text-rotulo-sm text-project md:text-pequeno md:normal-case md:tracking-normal">{meta}</span>
    </Row>
  );
}

/**
 * Linha da lista: Nó de dia | título e meta | ação de 200. Celular: sem cartão e sem a coluna de ação (o
 * Primário vai pro fim da tela), como no quadro `34:2136`.
 */
function Row({ highlight, node, side, children }: { highlight: boolean; node: PathNode; side: ReactNode; children: ReactNode }) {
  return (
    <li
      className={`grid shrink-0 grid-cols-[56px_minmax(0,1fr)] items-center gap-4 md:border-2 md:px-6 md:py-2 lg:grid-cols-[72px_minmax(0,1fr)_200px] lg:short:py-1.5 ${
        highlight ? 'md:border-accent md:bg-surface md:shadow-[4px_4px_0_0_var(--color-accent-shadow)]' : 'md:border-stroke md:bg-surface'
      }`}
    >
      <span className="flex justify-center">
        <DayNode node={node} focusable={false} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">{children}</span>
      <span className="hidden lg:block">{side}</span>
    </li>
  );
}

function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="block text-right text-rotulo-sm text-accent hover:text-accent-hover">
      {children}
    </Link>
  );
}

function WeekSummary({ weekly, rows }: { weekly: WeeklyDetailDto; rows: DayRowData[] }) {
  const done = rows.filter((r) => r.day.status === DailyStatus.Completed).length;
  // Aprovação só sobre o que já foi respondido: Dia ainda não feito não derruba a conta.
  const answered = rows.reduce((sum, r) => sum + r.day.completedActivities, 0);
  const passed = rows.reduce((sum, r) => sum + r.day.passedActivities, 0);
  const reinforcements = rows.filter((r) => r.reinforcementId).length;
  const weakDays = weekly.dailies.filter((d) => !d.isReinforcement && d.isWeakDay).length;
  const current = rows.find((r) => r.node.state === 'atual' || r.node.state === 'disponivel');
  const next = current ? rows[rows.indexOf(current) + 1] : null;
  const status = !current
    ? weekly.isPracticeOnly || done < rows.length
      ? null
      : 'Os dias da semana estão feitos.'
    : current.node.state === 'disponivel'
      ? `Dia ${current.day.dayNumber} abre amanhã.`
      : `Dia ${current.day.dayNumber} ${current.day.status === DailyStatus.InProgress ? 'em andamento' : 'aberto'}.${next ? ` O Dia ${next.day.dayNumber} abre depois dele.` : ''}`;

  return (
    <Card kind="padrao" eyebrow="Resumo da semana" className="shrink-0">
      <dl className="flex gap-8">
        <Stat value={`${done}/${rows.length}`} label="Dias" tone="text-primary" />
        <Stat value={answered > 0 ? `${passed}/${answered}` : '-'} label="Aprovadas" tone="text-primary" />
        <Stat value={`${reinforcements}`} label={reinforcements === 1 ? 'Reforço' : 'Reforços'} tone={reinforcements > 0 ? 'text-project' : 'text-primary'} />
      </dl>
      {status && <p className="text-pequeno text-secondary">{status}</p>}
      {weekly.hasPendingWeeklyReinforcement && (
        <p className="text-pequeno text-project">
          Revisão da semana disponível{weakDays > 0 ? `: ${weakDays} ${weakDays === 1 ? 'dia fraco' : 'dias fracos'}` : ''}.
        </p>
      )}
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

/** Publicação pendente (cartão Âmbar): a Focada escreve o post, o aluno publica e a próxima semana abre. */
function PublishCard({ week, onPublish }: { week: number; onPublish: () => void }) {
  return (
    <Card kind="ambar" eyebrow="Falta publicar" className="shrink-0">
      <p className="text-pequeno text-primary">
        A Focada escreve o post com o que você estudou e o projeto entregue. Publique no LinkedIn pra liberar a Semana {week + 1}.
      </p>
      <Button onClick={onPublish} className="w-full md:w-auto md:self-start">
        Publicar a semana
      </Button>
    </Card>
  );
}

/**
 * Projeto da semana no resumo: o objetivo, tirado do 1º parágrafo do enunciado ("### Objetivo"). O nome do
 * projeto (projeto.json `title`) ainda não vem na API.
 */
function ProjectCard({ weekly }: { weekly: WeeklyDetailDto }) {
  const summary = objective(weekly.project?.specText ?? '');
  return (
    <Card kind="padrao" eyebrow="Projeto da semana" className="min-h-0 shrink">
      <p className="line-clamp-5 text-pequeno text-secondary">
        {summary ?? 'O enunciado aparece quando o code comigo fechar e você escolher a linguagem.'}
      </p>
    </Card>
  );
}

/** Primeiro parágrafo de texto do enunciado, sem marcação de Markdown. */
function objective(spec: string): string | null {
  const paragraph = spec
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('-') && !p.startsWith('```'));
  if (!paragraph) return null;
  return paragraph
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ');
}
