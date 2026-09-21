import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { MarkdownBlock } from '../activities/MarkdownBlock';

/**
 * Revisão rápida e SÓ LEITURA das anotações feitas nesta Daily (Fase 35 - ver
 * secret/rascunhos/caderninho-no-resumo-falado.md), aberta a partir de `VoiceSummaryActivity`
 * antes de gravar o Resumo Falado. Sem endpoint novo: é um recorte de `GET /courses/{courseId}/notes`.
 *
 * Fase 57 (bug real, 21/09/2026): até aqui o recorte era por DATA (`from=to=daily.date`) e numa
 * sessão de REFORÇO o painel aparecia sempre vazio - o reforço é outra Daily, com a Date do dia em
 * que foi gerado, e as anotações do dia ficam presas à Daily de origem. Agora o recorte é por
 * `dailyId`, e o backend inclui o dia base do reforço (`NoteDailyScope`): "reforço puxa as
 * anotações do dia base dele". Em reforço o texto do modal deixa isso claro e cada anotação diz de
 * qual dia veio.
 *
 * Read-only de propósito (nem `NoteEditorModal` aqui) - é uma olhada rápida antes de falar, não
 * uma sessão de edição; pra editar, o aluno usa a aba "Caderninho" (`CourseDetailPage`) como
 * sempre. Mesmo chrome de modal de `ContentPreviewModal`/`PublicationModal`.
 */
export function DailyNotesModal({
  courseId,
  dailyId,
  isReinforcement,
  onClose,
}: {
  courseId: string;
  dailyId: string;
  isReinforcement: boolean;
  onClose: () => void;
}) {
  const { data: notes, error, loading, retry } = useApiResource(() => api.listNotes(courseId, { dailyId }), [courseId, dailyId]);
  const title = isReinforcement ? 'Anotações do dia base' : 'Suas anotações de hoje';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-[560px] flex-col gap-5 overflow-y-auto rounded-2xl border border-surface-alt bg-surface p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-primary">{title}</h1>
            <p className="text-xs text-muted">
              {isReinforcement && 'Do dia que gerou este reforço. '}
              Só pra dar uma olhada antes de gravar - a gravação em si é sem consulta.
            </p>
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
            {isReinforcement
              ? 'Nenhuma anotação registrada no dia base deste reforço.'
              : 'Nenhuma anotação registrada hoje ainda - use "Anotação Rápida" na barra lateral se quiser guardar algo antes de gravar.'}
          </p>
        )}

        {!loading &&
          !error &&
          notes?.map((note) => (
            <div key={note.id} className="flex flex-col gap-2 rounded-xl border border-stroke bg-base p-4">
              {isReinforcement && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {note.dailyId === dailyId ? 'Anotada neste reforço' : `Dia ${note.dayNumber} (dia base)`}
                </p>
              )}
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
