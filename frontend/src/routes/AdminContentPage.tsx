import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { CURATED_CONTENT_TYPE_NAMES, type CuratedContentDto, type CuratedContentType } from '../api/types';
import { Centered, PageShell } from '../components/Layout';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';

/**
 * `/admin/conteudo` - tela de bastidor pra autoria de CuratedContent (Fase 6). Segue o mesmo
 * padrao de query string de `/start` (sem params -> cursos, ?course= -> semanas, ?course=&weekly=
 * -> conteudo da semana), mas sem o path de Daily - autoria e so no nivel de Weekly/CuratedContent.
 * Sem autenticacao, sem polimento visual - mesmo padrao funcional de /start.
 */
export function AdminContentPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course');
  const weeklyId = searchParams.get('weekly');

  if (weeklyId) return <WeeklyContentView weeklyId={weeklyId} courseId={courseId} />;
  if (courseId) return <CourseView courseId={courseId} />;
  return <CourseListView />;
}

function CourseListView() {
  const { data: courses, error, loading, retry } = useApiResource(() => api.getCourses(), []);

  if (loading) return <Centered text="Carregando cursos..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;

  return (
    <PageShell title="Autoria de conteúdo - Cursos">
      <ul className="flex flex-col gap-3">
        {courses?.map((course) => (
          <li key={course.id}>
            <Link
              to={`/admin/conteudo?course=${course.id}`}
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
  const { data: course, error, loading, retry } = useApiResource(() => api.getCourse(courseId), [courseId]);

  if (loading) return <Centered text="Carregando curso..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!course) return null;

  return (
    <PageShell title={course.name} backTo="/admin/conteudo">
      <div className="flex flex-col gap-4">
        {course.monthlies.map((monthly) => (
          <div key={monthly.id}>
            <h2 className="font-semibold text-primary">
              Mes {monthly.number}: {monthly.title}
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {monthly.weeklies.map((weekly) => (
                <li key={weekly.id}>
                  <Link
                    to={`/admin/conteudo?course=${courseId}&weekly=${weekly.id}`}
                    className="block rounded-xl border border-surface-alt bg-surface px-4 py-3 hover:border-accent"
                  >
                    <p className="text-primary">
                      Semana {weekly.number}: {weekly.title}
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

function WeeklyContentView({ weeklyId, courseId }: { weeklyId: string; courseId: string | null }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  // Bump pra forcar o useApiResource a refazer a busca apos salvar - mais simples do que dar ao
  // hook compartilhado um metodo de refetch que mais nenhuma outra tela usa ainda.
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: weekly, error, loading, retry } = useApiResource(() => api.getWeekly(weeklyId), [weeklyId, refreshKey]);

  if (loading) return <Centered text="Carregando semana..." />;
  if (error) return <ApiErrorScreen error={error} onRetry={retry} />;
  if (!weekly) return null;

  const backTo = courseId ? `/admin/conteudo?course=${courseId}` : '/admin/conteudo';
  const editing = editingId ? (weekly.curatedContents.find((c) => c.id === editingId) ?? null) : null;

  function handleSaved() {
    setEditingId(null);
    setRefreshKey((key) => key + 1);
  }

  return (
    <PageShell title={`Semana ${weekly.number}: ${weekly.title} - Conteúdo curado`} backTo={backTo}>
      <ul className="flex flex-col gap-2">
        {weekly.curatedContents.map((content) => {
          const complete = Boolean(content.externalUrl || content.bodyText);
          return (
            <li key={content.id}>
              <button
                type="button"
                onClick={() => setEditingId(content.id)}
                className={[
                  'flex w-full items-center justify-between rounded-xl border bg-surface px-4 py-3 text-left hover:border-accent',
                  editingId === content.id ? 'border-accent' : 'border-surface-alt',
                ].join(' ')}
              >
                <span>
                  <span className="text-xs uppercase tracking-wide text-secondary">
                    {CURATED_CONTENT_TYPE_NAMES[content.type]}
                  </span>
                  <p className="text-primary">{content.title}</p>
                </span>
                <span className={complete ? 'text-sm text-accent' : 'text-sm text-alert'}>
                  {complete ? 'Completo' : 'Pendente'}
                </span>
              </button>
            </li>
          );
        })}
        {weekly.curatedContents.length === 0 && (
          <p className="text-secondary">Nenhum conteúdo curado ainda nessa semana.</p>
        )}
      </ul>

      <div className="mt-6">
        {editingId && (
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="mb-2 text-sm text-secondary hover:text-primary"
          >
            &larr; Cancelar edição / novo conteúdo
          </button>
        )}
        <CuratedContentForm key={editingId ?? 'new'} weeklyId={weeklyId} existing={editing} onSaved={handleSaved} />
      </div>
    </PageShell>
  );
}

function CuratedContentForm({
  weeklyId,
  existing,
  onSaved,
}: {
  weeklyId: string;
  existing: CuratedContentDto | null;
  onSaved: (content: CuratedContentDto) => void;
}) {
  const [type, setType] = useState<CuratedContentType>(existing?.type ?? 0);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [externalUrl, setExternalUrl] = useState(existing?.externalUrl ?? '');
  const [bodyText, setBodyText] = useState(existing?.bodyText ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = existing
        ? await api.updateCuratedContent(existing.id, {
            title,
            externalUrl: externalUrl || null,
            bodyText: bodyText || null,
          })
        : await api.createCuratedContent({
            weeklyId,
            type: CURATED_CONTENT_TYPE_NAMES[type],
            title,
            externalUrl: externalUrl || null,
            bodyText: bodyText || null,
          });
      onSaved(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'rounded-lg border border-surface-alt bg-base px-3 py-2 text-primary';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-surface-alt bg-surface p-4">
      <h2 className="font-semibold text-primary">{existing ? `Editar: ${existing.title}` : 'Novo conteúdo'}</h2>

      <label className="flex flex-col gap-1 text-sm text-secondary">
        Tipo
        {existing ? (
          <span className="text-primary">{CURATED_CONTENT_TYPE_NAMES[existing.type]}</span>
        ) : (
          <select
            value={type}
            onChange={(event) => setType(Number(event.target.value) as CuratedContentType)}
            className={inputClass}
          >
            {CURATED_CONTENT_TYPE_NAMES.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm text-secondary">
        Título
        <input value={title} onChange={(event) => setTitle(event.target.value)} required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-secondary">
        URL externa (opcional)
        <input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-secondary">
        Texto / SVG (para Diagram, cole o SVG puro aqui)
        <textarea
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
          rows={12}
          className={`${inputClass} font-mono text-sm`}
        />
      </label>

      {error && <p className="text-sm text-alert">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-xl bg-accent px-4 py-2 font-semibold text-base disabled:opacity-50"
      >
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
