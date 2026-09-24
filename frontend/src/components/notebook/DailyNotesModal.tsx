import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import { MarkdownBlock } from '../activities/MarkdownBlock';
import { PIXEL_PROSE } from '../../lib/pixelProse';
import { PixelModal } from '../PixelModal';
import { PixelButton, PixelChip } from '../session/PixelButton';

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
 * uma sessão de edição; pra editar, o aluno usa o Caderninho. Casca `PixelModal` desde 24/09/2026
 * (abre por cima da sessão diária, que já é pixel art).
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
    <PixelModal label={title} title={title} onClose={onClose}>
      <p className="font-pixel text-lg leading-snug text-secondary">
        {isReinforcement && 'Do dia que gerou este reforço. '}
        Só pra dar uma olhada antes de gravar - a gravação em si é sem consulta.
      </p>

      {loading && <p className="font-pixel text-lg text-secondary">Carregando...</p>}

      {error && (
        <div className="flex flex-col items-start gap-3 border-2 border-alert p-4">
          <p className="font-pixel text-lg leading-snug text-alert">Não foi possível carregar suas anotações.</p>
          <PixelButton ghost tone="muted" onClick={retry}>
            Tentar de novo
          </PixelButton>
        </div>
      )}

      {!loading && !error && notes?.length === 0 && (
        <p className="font-pixel text-lg leading-snug text-secondary">
          {isReinforcement
            ? 'Nenhuma anotação registrada no dia base deste reforço.'
            : 'Nenhuma anotação registrada hoje ainda - use "Anotação Rápida" na barra lateral se quiser guardar algo antes de gravar.'}
        </p>
      )}

      {!loading &&
        !error &&
        notes?.map((note) => (
          <div key={note.id} className="flex flex-col gap-2 border-2 border-stroke bg-surface p-4">
            {isReinforcement && (
              <p className="font-pixel-label text-[9px] text-muted">
                {note.dailyId === dailyId ? 'Anotada neste reforço' : `Dia ${note.dayNumber} (dia base)`}
              </p>
            )}
            <div className={PIXEL_PROSE}>
              <MarkdownBlock text={note.content} />
            </div>
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((t) => (
                  <PixelChip key={t}>{t}</PixelChip>
                ))}
              </div>
            )}
          </div>
        ))}
    </PixelModal>
  );
}
