import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { NoteDto } from '../api/types';
import { MarkdownBlock } from '../components/activities/MarkdownBlock';
import { ApiErrorScreen } from '../components/errors/ApiErrorScreen';
import { NoteEditorModal } from '../components/notebook/NoteEditorModal';
import { PixelPageHeader, PixelPanel } from '../components/PixelPage';
import { ScrollArea } from '../components/ScrollArea';
import { FocadaSays } from '../components/session/FocadaSays';
import { PIXEL_PROSE } from '../lib/pixelProse';
import pontoConcluido from '../assets/pixel/mapa/ponto-concluido.png';
import casteloPendente from '../assets/pixel/mapa/castelo-pendente.png';

type Period = 'all' | '7d' | 'month';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: '7d', label: '7 dias' },
  { value: 'month', label: 'Mês' },
];

/**
 * Caderninho de Anotacoes (Fase 29; tela propria desde a Fase 65; pixel art na Fase 74, Figma
 * "Certificacoes + Caderninho — v2", nodes 143:7246/143:8131). Roteado via `/start?course=&caderninho=1`.
 * Filtros a esquerda (busca, periodo e tags em chips - clicar de novo solta a tag), as notas no centro
 * agrupadas por dia (ponto do mapa) ou projeto (castelo), e a direita a Focada + um resumo (total de
 * notas, dias com nota e tag mais usada, calculados da lista sem filtro). Clicar numa nota abre o
 * editor (NoteEditorModal). Mesmas rotas de notas e tags de antes.
 */
export function NotebookPage({ courseId }: { courseId: string }) {
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
  const { data: allNotes, retry: retryAll } = useApiResource(() => api.listNotes(courseId), [courseId]);
  const { data: knownTags } = useApiResource(() => api.listNoteTags(courseId), [courseId]);
  const { data: course } = useApiResource(() => api.getCourse(courseId), [courseId]);

  const groups = groupByContext(notes ?? []);
  const filtered = period !== 'all' || !!debouncedSearch || !!tag;
  const refresh = () => {
    setEditingNote(null);
    retry();
    retryAll();
  };

  return (
    <div className="flex flex-col gap-4 bg-base px-4 pt-5 pb-10 lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:px-8 lg:pt-8 lg:pb-10 xl:px-16 lg:short:gap-3 lg:short:pt-5 lg:short:pb-6">
      <PixelPageHeader backTo={`/start?course=${courseId}`} crumb={`Caderninho${course ? ` · ${course.name}` : ''}`} />

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[260px] xl:w-[300px]">
          <PixelPanel label="Filtros">
            <label className="flex items-center gap-2 border-2 border-stroke px-3 py-2 focus-within:border-accent">
              <span className="font-pixel-label text-[10px] text-accent" aria-hidden="true">
                &gt;
              </span>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="buscar nas notas..."
                aria-label="Buscar nas notas"
                className="min-w-0 flex-1 bg-transparent font-pixel text-xl leading-snug text-primary outline-none placeholder:text-muted"
              />
            </label>
            <p className="font-pixel-label text-[8px] text-secondary">Período</p>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Período">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`border-2 py-2.5 font-pixel-label text-[9px] leading-none ${
                    period === p.value ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {(knownTags ?? []).length > 0 && (
              <>
                <p className="font-pixel-label text-[8px] text-secondary">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {(knownTags ?? []).map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tag === t}
                      onClick={() => setTag((current) => (current === t ? '' : t))}
                      className={`border-2 px-2 py-1.5 font-pixel-label text-[9px] leading-none ${
                        tag === t ? 'border-accent bg-accent text-base' : 'border-stroke text-secondary hover:text-primary'
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </PixelPanel>
        </div>

        <section className="flex min-w-0 flex-col gap-3 border-2 border-accent/60 bg-base p-4 shadow-[6px_6px_0_0_#1c9e3e] sm:px-6 sm:pt-5 lg:min-h-0 lg:flex-1">
          <div className="flex items-end justify-between gap-3 lg:shrink-0">
            <div className="flex flex-col gap-1.5">
              <p className="font-pixel-label text-[10px] text-accent">// Suas anotações</p>
              <h1 className="font-pixel text-[40px] leading-none text-primary lg:short:text-[34px]">Caderninho</h1>
            </div>
            {notes && (
              <p className="font-pixel-label text-[8px] text-muted">
                {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
                {tag ? ` · #${tag}` : ''}
              </p>
            )}
          </div>

          <ScrollArea className="lg:min-h-0 lg:flex-1" contentClassName="flex flex-col gap-3 lg:pr-3">
            {error ? (
              <ApiErrorScreen error={error} onRetry={retry} />
            ) : loading && !notes ? (
              <p className="font-pixel text-xl text-secondary">Carregando notas...</p>
            ) : groups.length === 0 ? (
              <p className="border-2 border-dashed border-stroke px-4 py-6 font-pixel text-xl leading-snug text-secondary">
                {filtered ? 'Nenhuma nota encontrada com esse filtro.' : 'Nenhuma nota ainda. Use a Anotação rápida durante uma Daily ou no Projeto Semanal pra começar.'}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="flex flex-col gap-2.5 pb-2">
                  <p className={`flex items-center gap-2 font-pixel-label text-[9px] ${group.project ? 'text-project' : 'text-secondary'}`}>
                    <img src={group.project ? casteloPendente : pontoConcluido} alt="" className="size-4 pixelated" aria-hidden="true" />
                    {group.label}
                  </p>
                  {group.notes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setEditingNote(note)}
                      className="flex flex-col gap-2.5 border-2 border-stroke bg-base px-4 py-3.5 text-left hover:border-accent"
                    >
                      <div className={PIXEL_PROSE}>
                        <MarkdownBlock text={note.content} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {note.tags.map((t) => (
                          <span key={t} className="border-2 border-stroke px-2 py-1 font-pixel-label text-[8px] leading-none text-secondary">
                            #{t}
                          </span>
                        ))}
                        <span className="ml-auto font-pixel-label text-[8px] text-muted">Editar ›</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </ScrollArea>
        </section>

        <ScrollArea className="hidden shrink-0 lg:block lg:h-full lg:min-h-0 lg:w-[300px] xl:w-[324px]" contentClassName="flex flex-col gap-4 lg:pr-2">
          <FocadaSays size="md">Anotação boa é a que você entende daqui a um mês, agente. Escreva com as suas palavras, não copie o texto.</FocadaSays>
          <NotebookSummary notes={allNotes ?? []} totalDays={course?.progress.totalDailies ?? null} />
          <PixelPanel label="Como anotar">
            <p className="font-pixel text-[19px] leading-tight text-secondary">
              Pela Anotação rápida, na coluna direita da Daily e do Projeto Semanal. A nota fica presa ao dia (ou ao projeto) em que foi escrita.
            </p>
          </PixelPanel>
        </ScrollArea>
      </div>

      {editingNote && (
        <NoteEditorModal note={editingNote} courseId={courseId} onClose={() => setEditingNote(null)} onSaved={refresh} onDeleted={refresh} />
      )}
    </div>
  );
}

function NotebookSummary({ notes, totalDays }: { notes: NoteDto[]; totalDays: number | null }) {
  const days = new Set(notes.filter((n) => n.dailyId).map((n) => n.dailyId)).size;
  const counts = new Map<string, number>();
  for (const note of notes) for (const t of note.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topTag = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const row = (label: string, value: string, tone: string) => (
    <div className="flex items-center justify-between gap-3">
      <span className="font-pixel-label text-[9px] text-secondary">{label}</span>
      <span className={`font-pixel text-[28px] leading-none ${tone}`}>{value}</span>
    </div>
  );
  return (
    <PixelPanel label="Resumo">
      {row('Notas', String(notes.length), 'text-primary')}
      {row('Dias com nota', totalDays ? `${days}/${totalDays}` : String(days), 'text-accent')}
      {topTag && row('Tag mais usada', `#${topTag}`, 'text-project')}
    </PixelPanel>
  );
}

interface NoteGroup {
  key: string;
  label: string;
  project: boolean;
  notes: NoteDto[];
}

/** Notas ja vem ordenadas pelo backend; agrupa as seguidas do mesmo dia (ou do mesmo projeto). */
function groupByContext(notes: NoteDto[]): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (const note of notes) {
    const project = note.dayNumber === null;
    const key = `${note.weekNumber}-${note.dayNumber ?? 'p'}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.notes.push(note);
    } else {
      const label = project ? `Semana ${note.weekNumber} · Projeto` : `Semana ${note.weekNumber} · Dia ${String(note.dayNumber).padStart(2, '0')}`;
      groups.push({ key, label, project, notes: [note] });
    }
  }
  return groups;
}

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function periodRange(period: Period): { from?: string; to?: string } {
  if (period === 'all') return {};
  const today = new Date();
  const to = toDateOnly(today);
  if (period === '7d') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toDateOnly(from), to };
  }
  return { from: toDateOnly(new Date(today.getFullYear(), today.getMonth(), 1)), to };
}
