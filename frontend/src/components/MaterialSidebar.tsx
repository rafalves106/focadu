import type { CuratedContentDto } from '../api/types';
import dotMedium from '../assets/reading/dot-medium.svg';
import playThumbnail from '../assets/reading/play-thumbnail.svg';
import playThumbnailActive from '../assets/reading/play-thumbnail-active.svg';
import checkIcon from '../assets/reading/check-icon.svg';

const GROUP_LABEL: Record<number, string> = { 0: 'LEITURA', 1: 'VÍDEO' };

/**
 * "Material de hoje" (design Figma sessao-leitura/sessao-video, Fase 7) - a lista de
 * CuratedContent da semana, agrupada por tipo (Reading/Video).
 * Compartilhado entre ReadingActivity e VideoActivity - so muda o item ativo/concluido.
 *
 * Fase 23: itens viram botao (`onSelect`) que abre `ContentPreviewModal` - antes eram so status
 * visual, sem jeito de reler o texto/reassistir o video depois de passar da etapa (pesava mais
 * numa Daily de reforco, onde nao ha etapa de Leitura/Video pra voltar - so o Resumo Falado).
 */
export function MaterialSidebar({
  contents,
  activeContentId,
  completedContentIds,
  onSelect,
}: {
  contents: CuratedContentDto[];
  /** Nulo nas telas sem conteudo proprio (Quiz/Ligar Palavras/Cloze/Roleplay, Fase 19) - nenhum item fica em destaque, so o estado concluido aparece. */
  activeContentId: string | null;
  completedContentIds: Set<string>;
  onSelect: (contentId: string) => void;
}) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-4 rounded-2xl border border-stroke bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">Material de hoje</p>

      {([0, 1] as const).map((type) => {
        const items = contents.filter((c) => c.type === type);
        if (items.length === 0) return null;

        return (
          <div key={type} className="flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-[1px] text-secondary">{GROUP_LABEL[type]}</p>

            {type === 0
              ? items.map((item) => {
                  const isActive = item.id === activeContentId;
                  const isDone = completedContentIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={
                        isActive
                          ? 'flex w-full items-center gap-2.5 rounded-[10px] border border-accent bg-accent/25 p-3 text-left hover:bg-accent/35'
                          : 'flex w-full items-center gap-2.5 rounded-[10px] border border-transparent bg-surface-alt p-3 text-left hover:border-stroke'
                      }
                    >
                      {isDone ? (
                        <span className="flex size-3 shrink-0 items-center justify-center rounded-[6px] bg-accent">
                          <img src={checkIcon} alt="" className="size-2" />
                        </span>
                      ) : (
                        <img src={dotMedium} alt="" className="size-2 shrink-0" />
                      )}
                      <span className="truncate text-[13px] text-primary">{item.title}</span>
                    </button>
                  );
                })
              : items.map((item) => {
                  const isActive = item.id === activeContentId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={
                        isActive
                          ? 'flex w-full flex-col gap-2 rounded-[10px] border border-accent bg-accent/25 text-left'
                          : 'flex w-full flex-col gap-2 rounded-[10px] bg-surface-alt text-left hover:brightness-110'
                      }
                    >
                      <div className="relative flex h-[110px] w-full items-center justify-center rounded-[10px] bg-base">
                        <img src={isActive ? playThumbnailActive : playThumbnail} alt="" className="size-8" />
                      </div>
                      <p className="truncate px-3 pb-3 text-xs font-medium text-primary">{item.title}</p>
                    </button>
                  );
                })}
          </div>
        );
      })}
    </aside>
  );
}
