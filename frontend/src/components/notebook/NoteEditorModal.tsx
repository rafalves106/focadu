import { useState } from 'react';
import { ApiError, api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { NoteDto } from '../../api/types';
import { noteContextLabel } from '../../lib/noteContext';
import { PixelConfirmDialog } from '../PixelConfirmDialog';
import { PixelModal, pixelField } from '../PixelModal';
import { PixelButton } from '../session/PixelButton';

function parseTags(raw: string): string[] {
  return Array.from(new Set(raw.split(',').map((t) => t.trim()).filter(Boolean)));
}

/**
 * Estado de edição de uma nota do Caderninho (Fase 29) - backdrop clicável fecha, painel para
 * propagação. Reaproveita o mesmo campo de captura do QuickNotePanel (textarea markdown + tags), só
 * que pré-preenchido e com Salvar/Excluir em vez de Criar.
 *
 * Pixel art desde 24/09/2026: casca `PixelModal`, campos do `QuickNotePanel` pixel e a confirmação de
 * apagar pela Focada (`PixelConfirmDialog`, foco no "cancelar") no lugar do `window.confirm`.
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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
    setConfirmingDelete(false);
    if (deleting) return;
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
    <>
      <PixelModal label="Editar nota" title={noteContextLabel(note)} onClose={onClose}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          aria-label="Conteúdo da nota"
          className={`${pixelField} resize-none`}
        />

        <input
          list="note-editor-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="Tags (separadas por vírgula)"
          aria-label="Tags"
          className={pixelField}
        />
        <datalist id="note-editor-tags">
          {(knownTags ?? []).map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>

        {error && <p className="font-pixel text-lg leading-snug text-alert">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <PixelButton ghost tone="alert" onClick={() => setConfirmingDelete(true)} disabled={deleting || saving}>
            {deleting ? 'Apagando...' : 'Apagar nota'}
          </PixelButton>
          <PixelButton onClick={handleSave} disabled={!content.trim() || saving || deleting}>
            {saving ? 'Salvando...' : 'Salvar'}
          </PixelButton>
        </div>
      </PixelModal>

      {/* Irmao do PixelModal, nunca filho: o clip-path da caixa e o backdrop-filter do fundo cortariam
          um `fixed` la dentro. */}
      <PixelConfirmDialog
        open={confirmingDelete}
        message="Apagar esta nota, agente? Não tem como desfazer depois."
        cancelLabel="Melhor não, deixa ela aí"
        confirmLabel="Pode apagar"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
