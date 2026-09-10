import { useState } from 'react';
import { ApiError, api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { NoteDto } from '../../api/types';

function parseTags(raw: string): string[] {
  return Array.from(new Set(raw.split(',').map((t) => t.trim()).filter(Boolean)));
}

/**
 * Estado de edição de uma nota do Caderninho (Fase 29) - mesmo chrome de modal do
 * ContentPreviewModal (backdrop clicável fecha, painel para propagação). Reaproveita o mesmo
 * campo de captura do QuickNotePanel (textarea markdown + tags), só que pré-preenchido e com
 * Salvar/Excluir em vez de Criar.
 */
export function NoteEditorModal({
  note,
  courseId,
  onClose,
  onSaved,
  onDeleted,
}: {
  note: NoteDto;
  courseId: string;
  onClose: () => void;
  onSaved: (updated: NoteDto) => void;
  onDeleted: () => void;
}) {
  const { data: knownTags } = useApiResource(() => api.listNoteTags(courseId), [courseId]);
  const [content, setContent] = useState(note.content);
  const [tagsInput, setTagsInput] = useState(note.tags.join(', '));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!content.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateNote(note.id, content.trim(), parseTags(tagsInput));
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a nota. Tente de novo.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting || !window.confirm('Apagar esta nota? Essa ação não pode ser desfeita.')) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteNote(note.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível apagar a nota. Tente de novo.');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-[560px] flex-col gap-4 overflow-y-auto rounded-2xl border border-surface-alt bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Editar nota"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-semibold text-accent">
            Semana {note.weekNumber}, Dia {note.dayNumber}
          </p>
          <button type="button" onClick={onClose} className="shrink-0 text-secondary hover:text-primary" aria-label="Fechar">
            ✕
          </button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full resize-none rounded-xl border border-stroke bg-base p-3 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <input
          list="note-editor-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Tags (separadas por vírgula)"
          className="w-full rounded-xl border border-stroke bg-base px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <datalist id="note-editor-tags">
          {(knownTags ?? []).map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>

        {error && <p className="text-xs text-alert">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="text-xs font-semibold text-alert hover:underline disabled:opacity-50"
          >
            {deleting ? 'APAGANDO...' : 'APAGAR NOTA'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || saving || deleting}
            className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold tracking-wide text-base disabled:opacity-50"
          >
            {saving ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
