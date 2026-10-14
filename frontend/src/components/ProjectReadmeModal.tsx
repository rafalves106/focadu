import { api } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import { MarkdownBlock } from './activities/MarkdownBlock';
import { PixelModal } from './PixelModal';
import { PixelButton } from './session/PixelButton';
import { PIXEL_PROSE } from '../lib/pixelProse';

/**
 * README do repositorio do Projeto Semanal (Fase 100b). O fork e privado e o aluno nao entra no
 * Forgejo, entao o texto vem do backend (GET /weeklies/{id}/project/readme) e e renderizado aqui com
 * o mesmo renderizador das leituras - so o Markdown que o MarkdownBlock aceita aparece.
 */
export function ProjectReadmeModal({ weeklyId, onClose }: { weeklyId: string; onClose: () => void }) {
  const { data, error, loading, retry } = useApiResource(() => api.getWeeklyProjectReadme(weeklyId), [weeklyId]);

  return (
    <PixelModal label="README do projeto" title="README.MD" onClose={onClose} widthClass="max-w-3xl">
      {loading ? (
        <p className="min-h-32 font-pixel text-xl text-secondary">Carregando README...</p>
      ) : error || !data ? (
        <div className="flex min-h-32 flex-col items-start gap-4">
          <p role="alert" className="font-pixel text-lg leading-tight text-alert">
            Não consegui carregar o README. Tente de novo.
          </p>
          <PixelButton ghost onClick={retry}>
            Tentar de novo
          </PixelButton>
        </div>
      ) : (
        <div className={PIXEL_PROSE}>
          <MarkdownBlock text={data.text} />
        </div>
      )}
    </PixelModal>
  );
}
