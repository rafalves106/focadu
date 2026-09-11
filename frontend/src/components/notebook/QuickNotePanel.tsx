import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';

function parseTags(raw: string): string[] {
  return Array.from(new Set(raw.split(',').map((t) => t.trim()).filter(Boolean)));
}

/**
 * Painel de captura rápida do Caderninho de Anotações (Fase 29, ver secret/rascunhos/caderninho-
 * de-anotacoes.md) - só escreve e salva, nunca lista nada (nem as notas já criadas nesta mesma
 * Daily): mantém o foco da sessão minimalista, decisão do rascunho. Pra reler, o link "Caderninho"
 * leva pra aba de histórico completo em `/start?course=&tab=caderninho` (CourseDetailPage).
 *
 * Empilhado abaixo do `<MaterialSidebar>` já existente (ver useMaterialSidebar.tsx) - nenhuma das
 * duas substitui a outra.
 */
export function QuickNotePanel({ dailyId, courseId }: { dailyId: string; courseId: string }) {
  const { data: knownTags } = useApiResource(() => api.listNoteTags(courseId), [courseId]);
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!content.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.createNote(dailyId, content.trim(), parseTags(tagsInput));
      setContent('');
      setTagsInput('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // mesmo padrao de "LINK COPIADO ✓" em ReferralCard.tsx.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a nota. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col gap-3 rounded-2xl border border-stroke bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Anotação Rápida</p>
        <Link
          to={`/start?course=${courseId}&tab=caderninho`}
          className="text-[10px] font-semibold uppercase tracking-wide text-accent hover:underline"
        >
          Caderninho &rarr;
        </Link>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Anote um insight, dúvida ou resumo desta aula (markdown: **negrito**, - lista, [link](url))..."
        rows={5}
        className="w-full resize-none rounded-xl border border-stroke bg-base p-3 text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      />

      <input
        list="quick-note-tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (separadas por vírgula)"
        className="w-full rounded-xl border border-stroke bg-base px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
      />
      {/* Autocomplete nativo do navegador com as tags que o proprio aluno ja usou neste Course
          (ListNoteTagsUseCase) - evita duplicata tipo "insight" vs "insights", sem lib nova. */}
      <datalist id="quick-note-tags">
        {(knownTags ?? []).map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {error && <p className="text-xs text-alert">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!content.trim() || saving}
        className="rounded-xl bg-accent py-2.5 text-sm font-bold tracking-wide text-base disabled:opacity-50"
      >
        {saved ? 'SALVO ✓' : saving ? 'SALVANDO...' : 'SALVAR'}
      </button>
    </div>
  );
}
