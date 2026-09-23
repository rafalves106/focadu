import { useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useApiResource } from '../api/useApiResource';
import type { DailyActivityDto, DailyStateDto } from '../api/types';
import { MarkdownBlock } from './activities/MarkdownBlock';
import { SessionFooter, SessionLayout } from './SessionShell';
import { PixelButton } from './session/PixelButton';
import { stripFencedBlocks, stripRedundantTitleHeading } from '../lib/markdown';
import { PIXEL_PROSE } from '../lib/pixelProse';

const SECTION_HEADING = /^####\s+.+$/gm;

/**
 * Divide o Texto Cru em secoes por titulo "####" - precisa espelhar exatamente
 * GetCuratedContentUseCase.SplitIntoSections (backend) pra `personalizedAnalogies[i]` alinhar com
 * a secao certa por indice. Sem nenhum "####" encontrado, o texto inteiro vira 1 secao so (mesmo
 * fallback do backend) - so fica vazio se bodyText tambem estiver vazio.
 */
function splitReadingSections(bodyText: string): { preamble: string; sections: string[] } {
  const matches = [...bodyText.matchAll(SECTION_HEADING)];
  if (matches.length === 0) return { preamble: '', sections: bodyText ? [bodyText] : [] };

  const preamble = bodyText.slice(0, matches[0].index!).trim();
  const sections = matches.map((match, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index! : bodyText.length;
    return bodyText.slice(match.index!, end).trim();
  });
  return { preamble, sections };
}

/**
 * Etapa de leitura (ActivityType.Reading, ContentId obrigatorio). Concluir so registra uma
 * ActivityResponse com Score fixo (backend) e avanca direto - sem gabarito nem Focada.
 *
 * Fase 68 (Figma "Daily — 01"): o texto rola dentro do cartao da casca (antes tinha rolagem propria
 * com `max-h`), a analogia "pra voce" (IA, Fases 21/47) vira caixa ambar e o botao fica no rodape fixo.
 */
export function ReadingActivity({
  dailyId,
  activity,
  onDailyRefetched,
  onContinue,
}: {
  dailyId: string;
  activity: DailyActivityDto;
  onDailyRefetched: (daily: DailyStateDto) => void;
  onContinue: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: content, error: contentError, loading, retry } = useApiResource(
    () => api.getCuratedContent(activity.contentId!),
    [activity.contentId],
  );
  const { preamble, sections } = useMemo(() => splitReadingSections(content?.bodyText ?? ''), [content?.bodyText]);

  // Fase 36: revisitando via "Etapa anterior", deixa claro que a leitura ja foi concluida.
  const alreadyCompleted = activity.responses.length > 0;

  async function handleComplete() {
    if (alreadyCompleted) {
      onContinue();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.submitActivityResponse(dailyId, activity.id, {});
      onDailyRefetched(await api.getDaily(dailyId));
      onContinue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível concluir a leitura. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SessionLayout>
        <p className="font-pixel text-xl text-secondary">Carregando leitura...</p>
      </SessionLayout>
    );
  }
  if (contentError || !content) {
    return (
      <SessionLayout>
        <p className="font-pixel text-lg leading-tight text-alert">{contentError?.message ?? 'Leitura não encontrada.'}</p>
        <SessionFooter>
          <PixelButton ghost onClick={retry}>
            Tentar de novo
          </PixelButton>
        </SessionFooter>
      </SessionLayout>
    );
  }

  const sourceHost = content.externalUrl ? new URL(content.externalUrl).hostname.replace(/^www\./, '').toUpperCase() : null;
  // stripFencedBlocks: um bloco "```diagrama" (Fase 30) nao e prosa "lida" - fora da estimativa de tempo.
  const wordCount = stripFencedBlocks(content.bodyText ?? '').trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : null;
  const analogies = content.personalizedAnalogies ?? [];

  return (
    <SessionLayout
      sub={readMinutes ? `~${readMinutes} min` : ''}
      // Fase 32: o Suporte Rapido de IA recebe o texto real da leitura.
      assistantContext={`Leitura: "${content.title}"\n\n${content.bodyText ?? ''}`}
    >
      {sourceHost && <p className="font-pixel-label text-[8px] text-secondary">Fonte: {sourceHost}</p>}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-pixel text-[32px] leading-none text-primary">{content.title}</h2>
        {alreadyCompleted && <span className="mt-1.5 shrink-0 font-pixel-label text-[9px] text-accent">✓ Concluída</span>}
      </div>

      {/* Fase 68: texto curado tambem em VT323 (pedido do dono: sessao inteira na fonte pixel). */}
      <div className={PIXEL_PROSE}>
        {!content.bodyText && <p className="font-pixel text-lg leading-tight text-secondary">Conteúdo ainda não cadastrado.</p>}
        {preamble && <MarkdownBlock text={stripRedundantTitleHeading(preamble, content.title)} />}
        {/* Uma analogia por seção "####" (mesma ordem de splitReadingSections). */}
        {sections.map((section, i) => (
          <div key={i} className={preamble || i > 0 ? 'mt-5' : ''}>
            <MarkdownBlock text={section} />
            {analogies[i] && (
              <div className="mt-4 flex flex-col gap-2 border-2 border-project px-4 py-3">
                <p className="font-pixel-label text-[9px] text-project">// Pra você</p>
                <p className="font-pixel text-xl leading-tight text-primary">{analogies[i]}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="font-pixel text-lg leading-tight text-alert">{error}</p>}

      <SessionFooter>
        {!alreadyCompleted && readMinutes && <p className="font-pixel-label text-[8px] text-muted">~{readMinutes} min de leitura</p>}
        <PixelButton onClick={handleComplete} disabled={submitting}>
          {alreadyCompleted ? 'Próxima etapa ›' : submitting ? 'Enviando...' : 'Concluí a leitura ›'}
        </PixelButton>
      </SessionFooter>
    </SessionLayout>
  );
}
