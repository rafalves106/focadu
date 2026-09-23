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
 * `fill` (Fase 63, Projeto Semanal): o cartao ocupa a altura que o pai der (264px: 240px do Figma + 10%) e o
 * texto estica pra preencher o que sobra. Desde 23/09/2026 tambem e a variante pixel art (mesma
 * linguagem dos cartoes laterais da trilha): `pixel-box`, rotulo/botao em Silkscreen, campos em
 * VT323 com borda reta. Sem `fill`, nada muda (Daily).
 */
export function QuickNotePanel({
  target,
  courseId,
  fill = false,
  className = '',
}: {
  /** Onde a nota fica presa: a Daily da sessao ou, na tela do projeto (Fase 63), o Projeto Semanal. */
  target: { dailyId: string } | { weeklyId: string };
  courseId: string;
  fill?: boolean;
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
      setTimeout(() => setSaved(false), 2000); // mesmo padrao de "LINK COPIADO ✓" em ReferralCard.tsx.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a nota. Tente de novo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`flex shrink-0 flex-col ${
        fill ? 'pixel-box gap-2 bg-base p-5' : 'w-[280px] gap-3 rounded-2xl border border-stroke bg-surface p-5'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        {fill ? (
          <CardLabel pixel>Anotação rápida</CardLabel>
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Anotação Rápida</p>
        )}
        {fill ? (
          // Icone do Caderninho (mesmo do atalho na trilha): o texto "Caderninho →" em Silkscreen nao cabia
          // na mesma linha do rotulo nos 250px da coluna.
          <Link
            to={`/start?course=${courseId}&caderninho=1`}
            aria-label="Abrir o Caderninho"
            title="Abrir o Caderninho"
            className="shrink-0 opacity-80 hover:opacity-100"
          >
            <img src={notebookIcon} alt="" className="size-4 pixelated" />
          </Link>
        ) : (
          <Link
            to={`/start?course=${courseId}&caderninho=1`}
            className="text-[10px] font-semibold uppercase tracking-wide text-accent hover:underline"
          >
            Caderninho &rarr;
          </Link>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          fill
            ? 'dailyId' in target
              ? 'Anote um insight ou dúvida desta etapa (aceita markdown)...'
              : 'Anote um insight ou dúvida do projeto (aceita markdown)...'
            : 'Anote um insight, dúvida ou resumo desta aula (markdown: **negrito**, *itálico*, `código`, - lista, [link](url))...'
        }
        rows={fill ? 2 : 5}
        className={`w-full resize-none text-primary placeholder:text-muted focus:outline-none ${
          fill
            ? 'min-h-0 flex-1 border-2 border-stroke bg-surface px-2 py-1.5 font-pixel text-lg leading-snug focus:border-accent'
            : 'rounded-xl border border-stroke bg-base p-3 text-sm focus:ring-1 focus:ring-accent'
        }`}
      />

      <input
        list="quick-note-tags"
        value={tagsInput}
        onChange={(e) => setTagsInput(e.target.value)}
        placeholder="Tags (separadas por vírgula)"
        className={`w-full text-primary placeholder:text-muted focus:outline-none ${
          fill
            ? 'border-2 border-stroke bg-surface px-2 py-1 font-pixel text-lg leading-snug focus:border-accent'
            : 'rounded-xl border border-stroke bg-base px-3 py-2 text-xs focus:ring-1 focus:ring-accent'
        }`}
      />
      {/* Autocomplete nativo do navegador com as tags que o proprio aluno ja usou neste Course
          (ListNoteTagsUseCase) - evita duplicata tipo "insight" vs "insights", sem lib nova. */}
      <datalist id="quick-note-tags">
        {(knownTags ?? []).map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      {error && <p className={fill ? 'font-pixel text-lg leading-snug text-alert' : 'text-xs text-alert'}>{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!content.trim() || saving}
        className={
          fill
            ? 'bg-accent py-2.5 font-pixel-label text-[10px] text-base hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100'
            : 'rounded-xl bg-accent py-2.5 text-sm font-bold tracking-wide text-base disabled:opacity-50'
        }
      >
        {saved ? 'SALVO ✓' : saving ? 'SALVANDO...' : 'SALVAR'}
      </button>
    </div>
  );
}
