import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { CardLabel } from '../CardLabel';
import notebookIcon from '../../assets/pixel/terminal.png';

function parseTags(raw: string): string[] {
  return Array.from(new Set(raw.split(',').map((t) => t.trim()).filter(Boolean)));
}

/**
 * Painel de captura rápida do Caderninho de Anotações (Fase 29, ver secret/rascunhos/caderninho-
 * de-anotacoes.md) - só escreve e salva, nunca lista nada (nem as notas já criadas nesta mesma
 * Daily): mantém o foco da sessão minimalista, decisão do rascunho. Pra reler, o link "Caderninho"
 * leva pra aba de histórico completo em `/start?course=&caderninho=1` (NotebookPage, Fase 65).
 *
 * Empilhado abaixo do `<MaterialSidebar>` já existente (ver useMaterialSidebar.tsx) - nenhuma das
 * duas substitui a outra.
 *
 * O cartao ocupa a altura que o pai der (`className`) e o texto estica pra preencher o que sobra. Pixel
 * art desde 23/09/2026: `pixel-box`, rotulo/botao em Silkscreen, campos em VT323 com borda reta (a
 * variante antiga `fill={false}` saiu na Fase 74 - todo mundo ja usava esta).
 */
export function QuickNotePanel({
  target,
  courseId,
  className = '',
}: {
  /** Onde a nota fica presa: a Daily da sessao ou, na tela do projeto (Fase 63), o Projeto Semanal. */
  target: { dailyId: string } | { weeklyId: string };
  courseId: string;
  className?: string;
}) {
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
      if ('dailyId' in target) await api.createNote(target.dailyId, content.trim(), parseTags(tagsInput));
      else await api.createWeeklyProjectNote(target.weeklyId, content.trim(), parseTags(tagsInput));
      setContent('');
      setTagsInput('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // mesmo padrao de "Link copiado ✓" em squad/InviteModal.tsx.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a nota. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`flex shrink-0 flex-col ${
        'pixel-box gap-2 bg-base p-5'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <CardLabel pixel>Anotação rápida</CardLabel>
        {/* Icone do Caderninho (mesmo do atalho na trilha): o texto "Caderninho →" em Silkscreen nao cabia
            na mesma linha do rotulo nos 250px da coluna. */}
        <Link
          to={`/start?course=${courseId}&caderninho=1`}
          aria-label="Abrir o Caderninho"
          title="Abrir o Caderninho"
          className="shrink-0 opacity-80 hover:opacity-100"
        >
          <img src={notebookIcon} alt="" className="size-4 pixelated" />
        </Link>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          'dailyId' in target ? 'Anote um insight ou dúvida desta etapa (aceita markdown)...' : 'Anote um insight ou dúvida do projeto (aceita markdown)...'
        }
        rows={2}
        className="min-h-0 w-full flex-1 resize-none border-2 border-stroke bg-surface px-2 py-1.5 font-pixel text-lg leading-snug text-primary placeholder:text-muted focus:border-accent focus:outline-none"
      />

      <input
        list="quick-note-tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (separadas por vírgula)"
        className="w-full border-2 border-stroke bg-surface px-2 py-1 font-pixel text-lg leading-snug text-primary placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {/* Autocomplete nativo do navegador com as tags que o proprio aluno ja usou neste Course
          (ListNoteTagsUseCase) - evita duplicata tipo "insight" vs "insights", sem lib nova. */}
      <datalist id="quick-note-tags">
        {(knownTags ?? []).map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {error && <p className="font-pixel text-lg leading-snug text-alert">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!content.trim() || saving}
        className="bg-accent py-2.5 font-pixel-label text-[10px] text-base hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
      >
        {saved ? 'Salvo' : saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
}
