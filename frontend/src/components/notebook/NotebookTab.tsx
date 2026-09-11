import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { NoteDto } from '../../api/types';
import { Centered } from '../Layout';
import { ApiErrorScreen } from '../errors/ApiErrorScreen';
import { MarkdownBlock } from '../activities/MarkdownBlock';
import { NoteEditorModal } from './NoteEditorModal';

type Period = 'all' | '7d' | 'month';

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** from/to em data LOCAL (nao UTC) - "hoje"/"este mes" tem que bater com o calendario do aluno. */
function periodRange(period: Period): { from?: string; to?: string } {
  if (period === 'all') return {};

  const today = new Date();
  const to = toDateOnly(today);

  if (period === '7d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toDateOnly(from), to };
  }

  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toDateOnly(from), to };
}

interface NoteGroup {
  weekNumber: number;
  dayNumber: number;
  dailyDate: string;
  notes: NoteDto[];
}

/** Notas já vêm ordenadas mais recentes primeiro (ver ListNotesUseCase) - só agrupa notas consecutivas do mesmo dia, sem reordenar nada. */
function groupByDaily(notes: NoteDto[]): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (const note of notes) {
    const last = groups[groups.length - 1];
    if (last && last.weekNumber === note.weekNumber && last.dayNumber === note.dayNumber) {
      last.notes.push(note);
    } else {
      groups.push({ weekNumber: note.weekNumber, dayNumber: note.dayNumber, dailyDate: note.dailyDate, notes: [note] });
    }
  }
  return groups;
}

const SELECT_CLASS =
  'rounded-xl border border-stroke bg-surface px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-accent';

/**
 * Aba "Caderninho" do Course (Fase 29, ver secret/rascunhos/caderninho-de-anotacoes.md) - histórico
 * completo das notas do aluno neste curso, agrupado por Semana/Dia, com filtro por período/busca/
 * tag e CRUD completo (editar/apagar via NoteEditorModal). Criação só acontece no QuickNotePanel,
 * dentro do contexto de uma Daily - esta aba é só leitura/edição/exclusão do que já existe.
 */
export function NotebookTab({ courseId }: { courseId: string }) {
  const [period, setPeriod] = useState<Period>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tag, setTag] = useState('');
  const [editingNote, setEditingNote] = useState<NoteDto | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { from, to } = periodRange(period);
  const { data: notes, error, loading, retry } = useApiResource(
    () => api.listNotes(courseId, { from, to, q: debouncedSearch || undefined, tag: tag || undefined }),
    [courseId, period, debouncedSearch, tag],
  );
  const { data: knownTags } = useApiResource(() => api.listNoteTags(courseId), [courseId]);

  const groups = groupByDaily(notes ?? []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={SELECT_CLASS}>
          <option value="all">Todo o período</option>
          <option value="7d">Últimos 7 dias</option>
          <option value="month">Este mês</option>
        </select>

        <select value={tag} onChange={(e) => setTag(e.target.value)} className={SELECT_CLASS}>
          <option value="">Todas as tags</option>
          {(knownTags ?? []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar nas notas..."
          className="min-w-[200px] flex-1 rounded-xl border border-stroke bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {loading && <Centered text="Carregando notas..." />}
      {error && <ApiErrorScreen error={error} onRetry={retry} />}

      {!loading && !error && groups.length === 0 && (
        <p className="text-sm text-secondary">
          {period === 'all' && !debouncedSearch && !tag
            ? 'Nenhuma nota ainda - use o painel "Anotação Rápida" durante uma Daily pra começar.'
            : 'Nenhuma nota encontrada com esse filtro.'}
        </p>
      )}

      {!loading &&
        !error &&
        groups.map((group) => (
          <div key={`${group.weekNumber}-${group.dayNumber}`} className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Semana {group.weekNumber}, Dia {group.dayNumber}
            </p>
            {group.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setEditingNote(note)}
                className="flex flex-col gap-2 rounded-xl border border-stroke bg-surface p-4 text-left hover:border-accent"
              >
                <MarkdownBlock text={note.content} />
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map((t) => (
                      <span key={t} className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        ))}

      {editingNote && (
        <NoteEditorModal
          note={editingNote}
          courseId={courseId}
          onClose={() => setEditingNote(null)}
          onSaved={() => {
            setEditingNote(null);
            retry();
          }}
          onDeleted={() => {
            setEditingNote(null);
            retry();
          }}
        />
      )}
    </div>
  );
}
