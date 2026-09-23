import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { MarkdownBlock } from './activities/MarkdownBlock';
import { QuickNotePanel } from './notebook/QuickNotePanel';
import { extractYouTubeId } from '../lib/youtube';
import { stripRedundantTitleHeading } from '../lib/markdown';

/**
 * Revisão de um item do "Material de hoje" (Fase 23) - itens da `MaterialSidebar` eram só um
 * indicador visual de progresso, sem nenhum jeito de reabrir o texto/vídeo depois de passar da
 * etapa de Leitura/Vídeo. Isso pesa mais numa Daily de reforço, onde o Resumo Falado é a ÚNICA
 * atividade (`Daily.GetFailedActivities` só reaproveita atividades avaliáveis - Reading/Video
 * nunca "falham" pra entrar no reforço, ver `docs/ARQUITETURA.md`) - sem este modal, não havia
 * NENHUM jeito de reler o texto ou reassistir o vídeo antes de gravar o resumo de novo.
 *
 * Mesmo chrome de modal do `PublicationModal` (backdrop clicável fecha, painel para propagação).
 *
 * `dailyId`/`courseId` (corrigido em 2026-09-14): opcionais - quando os dois vêm (todo call site
 * real hoje, `useMaterialSidebar`), o modal ganha uma 2a coluna com `QuickNotePanel` ao lado do
 * vídeo/texto. Antes disso o modal (fixed inset-0, cobre a tela inteira) tampava o próprio
 * Caderninho que fica embaixo do `MaterialSidebar` - dava pra assistir o vídeo OU anotar o que
 * entendeu, nunca os dois ao mesmo tempo, reportado numa verificação ao vivo. Sem os 2 props, cai
 * pro layout de 1 coluna de antes (defensivo, nenhum call site hoje deixa de passar os dois).
 */
export function ContentPreviewModal({
  contentId,
  dailyId,
  courseId,
  onClose,
}: {
  contentId: string;
  dailyId?: string;
  courseId?: string;
  onClose: () => void;
}) {
  const { data: content, error, loading, retry } = useApiResource(() => api.getCuratedContent(contentId), [contentId]);
  const videoId = content?.type === 1 ? extractYouTubeId(content.externalUrl) : null;
  const showNotes = !!dailyId && !!courseId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" onClick={onClose} role="presentation">
      <div
        className={`flex max-h-[85vh] items-start gap-5 ${showNotes ? 'w-[940px]' : 'w-[640px]'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex max-h-[85vh] w-full flex-1 flex-col gap-5 overflow-y-auto rounded-2xl border border-surface-alt bg-surface p-8"
          role="dialog"
          aria-modal="true"
          aria-label={content?.title ?? 'Material de hoje'}
        >
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold text-primary">{content?.title ?? 'Carregando...'}</h1>
            <button type="button" onClick={onClose} className="shrink-0 text-secondary hover:text-primary" aria-label="Fechar">
              ✕
            </button>
          </div>

          {loading && <p className="text-sm text-secondary">Carregando...</p>}

          {error && (
            <div className="flex flex-col gap-2 rounded-xl border border-alert bg-alert/10 p-4 text-sm">
              <p className="text-alert">Não foi possível carregar este material.</p>
              <button type="button" onClick={retry} className="w-fit text-secondary hover:text-primary">
                Tentar de novo
              </button>
            </div>
          )}

          {content?.type === 1 && (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-base">
              {videoId ? (
                <iframe
                  className="size-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0`}
                  title={content.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex size-full items-center justify-center px-6 text-center text-sm text-muted">
                  Vídeo ainda não definido para este dia.
                </div>
              )}
            </div>
          )}

          {content?.bodyText && <MarkdownBlock text={stripRedundantTitleHeading(content.bodyText, content.title)} />}
        </div>

        {showNotes && <QuickNotePanel target={{ dailyId }} courseId={courseId} />}
      </div>
    </div>
  );
}
