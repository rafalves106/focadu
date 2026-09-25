import type { CuratedContentDto } from '../api/types';
import { extractYouTubeId } from '../lib/youtube';
import playThumbnail from '../assets/pixel/play-inativo.png';
import playThumbnailActive from '../assets/pixel/play-ativo.png';
import checkIcon from '../assets/pixel/check.png';
import { CardLabel } from './CardLabel';

const GROUP_LABEL: Record<number, string> = { 0: 'LEITURA', 1: 'VÍDEO' };

/**
 * "Material de hoje" (design Figma sessao-leitura/sessao-video, Fase 7) - a lista de
 * CuratedContent da semana, agrupada por tipo (Reading/Video).
 * Compartilhado entre ReadingActivity e VideoActivity - so muda o item ativo/concluido.
 *
 * Fase 23: itens viram botao (`onSelect`) - ate a Fase 67 abriam uma previa em modal; desde a Fase 68
 * a casca da sessao pergunta se o aluno quer voltar pra etapa do conteudo. Antes da Fase 23 eram so status
 * visual, sem jeito de reler o texto/reassistir o video depois de passar da etapa (pesava mais
 * numa Daily de reforco, onde nao ha etapa de Leitura/Video pra voltar - so o Resumo Falado).
 *
 * Miniatura de video (corrigido em 2026-09-13): ate aqui o item de VIDEO so mostrava o icone de
 * play generico (`playThumbnail`) sobre um fundo liso, nunca um frame real do video - reportado
 * como "miniatura nao renderiza". Agora usa a miniatura publica do proprio YouTube
 * (`img.youtube.com/vi/{id}/hqdefault.jpg`, sem chave/API paga) por baixo do mesmo icone de play,
 * a partir do `ExternalUrl` do CuratedContent (mesmo `extractYouTubeId` que `VideoActivity` ja usa
 * pro embed). Sem `videoId` reconhecido (link ainda nao cadastrado/formato inesperado), cai de
 * volta pro fundo liso de antes - nunca quebra a lista por causa de 1 item sem link.
 */
/* Fase 68: visual pixel art (caixa reta de 2px, rotulo em Silkscreen, titulos em VT323); a largura
 * vem da coluna da casca da sessao. */
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
  /** Omitido = itens so informativos (gravando, fora de sessao). */
  onSelect?: (contentId: string) => void;
}) {
  return (
    <aside className="flex shrink-0 flex-col gap-3 pixel-box bg-base p-5 lg:short:gap-2 lg:short:p-4">
      <CardLabel pixel>Material de hoje</CardLabel>

      {([0, 1] as const).map((type) => {
        const items = contents.filter((c) => c.type === type);
        if (items.length === 0) return null;

        return (
          <div key={type} className="flex flex-col gap-2">
            <p className="font-pixel-label text-[8px] text-muted">{GROUP_LABEL[type]}</p>

            {type === 0
              ? items.map((item) => {
                  const isActive = item.id === activeContentId;
                  const isDone = completedContentIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect?.(item.id)}
                      disabled={!onSelect}
                      title={item.title}
                      className={`flex w-full items-center gap-2 border-2 px-2.5 py-2 text-left enabled:hover:border-accent disabled:cursor-default ${
                        isActive ? 'border-accent bg-surface-alt' : 'border-stroke'
                      }`}
                    >
                      <img src={isDone ? checkIcon : isActive ? playThumbnailActive : playThumbnail} alt="" className="size-4 shrink-0 pixelated" />
                      <span className="truncate font-pixel text-lg leading-none text-primary">{item.title}</span>
                    </button>
                  );
                })
              : items.map((item) => {
                  const isActive = item.id === activeContentId;
                  const videoId = extractYouTubeId(item.externalUrl);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect?.(item.id)}
                      disabled={!onSelect}
                      title={item.title}
                      className="flex w-full flex-col gap-1.5 text-left enabled:hover:brightness-110 disabled:cursor-default"
                    >
                      <div
                        className={`relative flex h-[104px] w-full items-center lg:short:h-20 lg:tight:h-16 justify-center overflow-hidden border-2 bg-surface-alt ${
                          isActive ? 'border-accent' : 'border-stroke'
                        }`}
                      >
                        {videoId && (
                          <img
                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                          />
                        )}
                        {videoId && <div className="absolute inset-0 bg-base/45" />}
                        <img src={isActive ? playThumbnailActive : playThumbnail} alt="" className="relative size-8 pixelated" />
                      </div>
                      <p className="line-clamp-2 font-pixel text-base leading-tight text-secondary">{item.title}</p>
                    </button>
                  );
                })}
          </div>
        );
      })}
    </aside>
  );
}
