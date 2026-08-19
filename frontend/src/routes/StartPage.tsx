import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { Centered, PageShell } from '../components/Layout';
import { WeeklyProjectPage } from './WeeklyProjectPage';

/**
 * `/start` cobre 5 telas via query string (nao path params - ver docs/ARQUITETURA.md):
 * sem params -> lista de cursos; ?course= -> detalhe do curso; ?course=&weekly= -> detalhe da
 * semana; ?course=&weekly=&daily= -> estado de uma Daily especifica; ?course=&weekly=&project=
 * -> tela do projeto pratico da semana (Fase 7).
 */
export function StartPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  const weeklyId = searchParams.get('weekly');
  const dailyId = searchParams.get('daily');
  const showProject = searchParams.get('project') !== null;

  if (showProject && weeklyId) return <WeeklyProjectPage weeklyId={weeklyId} courseId={courseId} />;
  if (dailyId) return <DailyView dailyId={dailyId} weeklyId={weeklyId} courseId={courseId} />;
  if (weeklyId) return <WeeklyView weeklyId={weeklyId} courseId={courseId} />;
  if (courseId) return <CourseView courseId={courseId} />;
  return <CourseListView />;
}

function CourseListView() {
  const { data: courses, error, loading } = useApiResource(() => api.getCourses(), []);

  if (loading) return <Centered text="Carregando cursos..." />;
  if (error) return <Centered text={error} tone="alert" />;

  return (
    <PageShell title="Cursos">
      <ul className="flex flex-col gap-3">
        {courses?.map((course) => (
          <li key={course.id}>
            <Link
              to={`/start?course=${course.id}`}
              className="block rounded-xl border border-surface-alt bg-surface px-4 py-3 hover:border-accent"
            >
              <p className="font-semibold text-primary">{course.name}</p>
              <p className="text-sm text-secondary">{course.monthlyCount} mes(es)</p>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

function CourseView({ courseId }: { courseId: string }) {
  const { data: course, error, loading } = useApiResource(() => api.getCourse(courseId), [courseId]);

  if (loading) return <Centered text="Carregando curso..." />;
  if (error) return <Centered text={error} tone="alert" />;
  if (!course) return null;

  return (
    <PageShell title={course.name} backTo="/start">
      <p className="text-secondary">
        {course.progress.completedDailies}/{course.progress.totalDailies} dailies concluidas (
        {course.progress.completionPercentage}%)
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {course.monthlies.map((monthly) => (
          <div key={monthly.id}>
            <h2 className="font-semibold text-primary">
              Mes {monthly.number}: {monthly.title}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {monthly.weeklies.map((weekly) => (
                <li key={weekly.id}>
                  <Link
                    to={`/start?course=${courseId}&weekly=${weekly.id}`}
                    className="block rounded-xl border border-surface-alt bg-surface px-4 py-3 hover:border-accent"
                  >
                    <p className="text-primary">
                      Semana {weekly.number}: {weekly.title}
                    </p>
                    <p className="text-sm text-secondary">
                      {weekly.completedDailies}/{weekly.totalDailies} dailies
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function WeeklyView({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const { data: weekly, error, loading } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId]);

  if (loading) return <Centered text="Carregando semana..." />;
  if (error) return <Centered text={error} tone="alert" />;
  if (!weekly) return null;

  const backTo = courseId ? `/start?course=${courseId}` : '/start';

  return (
    <PageShell title={`Semana ${weekly.number}: ${weekly.title}`} backTo={backTo}>
      {weekly.theme && <p className="text-secondary">{weekly.theme}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {weekly.dailies.map((daily) => (
          <li key={daily.id}>
            <Link
              to={`/start?course=${courseId ?? ''}&weekly=${weeklyId}&daily=${daily.id}`}
              className="block rounded-xl border border-surface-alt bg-surface px-4 py-3 hover:border-accent"
            >
              <p className="text-primary">
                Dia {daily.dayNumber} - {daily.date}
              </p>
              <p className="text-sm text-secondary">
                {daily.completedActivities}/{daily.totalActivities} atividades
                {daily.isWeakDay ? ' - dia fraco' : ''}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {weekly.project && (
        <Link
          to={`/start?course=${courseId ?? ''}&weekly=${weeklyId}&project=1`}
          className="mt-6 block rounded-xl border border-project bg-project/10 p-4 hover:bg-project/20"
        >
          <h2 className="font-semibold text-project">Projeto da semana</h2>
          <p className="mt-1 line-clamp-2 text-sm text-secondary">{weekly.project.specText}</p>
        </Link>
      )}
    </PageShell>
  );
}

function DailyView({
  dailyId,
  weeklyId,
  courseId,
}: {
  dailyId: string;
  weeklyId: string | null;
  courseId: string | null;
}) {
  const { data: daily, error, loading } = useApiResource(() => api.getDaily(dailyId), [dailyId]);

  if (loading) return <Centered text="Carregando dia..." />;
  if (error) return <Centered text={error} tone="alert" />;
  if (!daily) return null;

  const backTo = `/start?course=${courseId ?? ''}&weekly=${weeklyId ?? daily.weeklyId}`;

  return (
    <PageShell title={`Dia ${daily.dayNumber}`} backTo={backTo}>
      <p className="text-secondary">{daily.date}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {daily.activities.map((activity) => (
          <li key={activity.id} className="rounded-xl border border-surface-alt bg-surface px-4 py-3">
            <p className="text-primary">{activity.prompt ?? `Atividade tipo ${activity.type}`}</p>
            <p className="text-sm text-secondary">
              {activity.responses.length > 0
                ? `Ultima nota: ${activity.responses.at(-1)?.score}`
                : 'Ainda nao respondida'}
            </p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
