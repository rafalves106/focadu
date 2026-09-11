import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { MarkdownBlock } from '../activities/MarkdownBlock';

/**
 * Revisão rápida e SÓ LEITURA das anotações feitas nesta Daily (Fase 35 - ver
 * secret/rascunhos/caderninho-no-resumo-falado.md), aberta a partir de `VoiceSummaryActivity`
 * antes de gravar o Resumo Falado. `from=to=date` reaproveita o mesmo filtro por período de
 * `ListNotesUseCase`/`NotebookTab` (comparado contra `Daily.Date`, não `CreatedAt`) - sem endpoint
 * novo, só um recorte de 1 dia do que `GET /courses/{courseId}/notes` já retorna.
 *
 * Read-only de propósito (nem `NoteEditorModal` aqui) - é uma olhada rápida antes de falar, não
 * uma sessão de edição; pra editar, o aluno usa a aba "Caderninho" (`CourseDetailPage`) como
 * sempre. Mesmo chrome de modal de `ContentPreviewModal`/`PublicationModal`.
 */
export function DailyNotesModal({ courseId, date, onClose }: { courseId: string; date: string; onClose: () => void }) {
  const { data: notes, error, loading, retry } = useApiResource(() => api.listNotes(courseId, { from: date, to: date }), [courseId, date]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-[560px] flex-col gap-5 overflow-y-auto rounded-2xl border border-surface-alt bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Suas anotações de hoje"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-primary">Suas anotações de hoje</h1>
            <p className="text-xs text-muted">Só pra dar uma olhada antes de gravar - a gravação em si é sem consulta.</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-secondary hover:text-primary" aria-label="Fechar">
            ✕
          </button>
        </div>

        {loading && <p className="text-sm text-secondary">Carregando...</p>}

        {error && (
          <div className="flex flex-col gap-2 rounded-xl border border-alert bg-alert/10 p-4 text-sm">
            <p className="text-alert">Não foi possível carregar suas anotações.</p>
            <button type="button" onClick={retry} className="w-fit text-secondary hover:text-primary">
              Tentar de novo
            </button>
          </div>
        )}

        {!loading && !error && notes?.length === 0 && (
          <p className="text-sm text-secondary">
            Nenhuma anotação registrada hoje ainda - use "Anotação Rápida" na barra lateral se quiser guardar algo antes de gravar.
          </p>
        )}

        {!loading &&
          !error &&
          notes?.map((note) => (
            <div key={note.id} className="flex flex-col gap-2 rounded-xl border border-stroke bg-base p-4">
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
            </div>
          ))}
      </div>
    </div>
  );
}
