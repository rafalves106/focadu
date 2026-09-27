import type { NotesReviewDto } from '../../api/types';
import { PIXEL_PROSE } from '../../lib/pixelProse';
import { MarkdownBlock } from '../activities/MarkdownBlock';
import focadaNeutra from '../../assets/pixel/focada-neutra.png';
import checkIcon from '../../assets/pixel/check.png';
import shieldIcon from '../../assets/pixel/escudo.png';
import lockIcon from '../../assets/pixel/cadeado-bloqueado.png';

function reviewedAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const d = new Date(iso);
  return `em ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Revisao por IA das notas de um dia (Fase 78, Figma "Caderninho: revisao por IA — v2", 166:4503): o que
 * esta bom, o que falta e se confere com o material. Nao vale nota. "Revisar de novo" so libera quando as
 * notas do dia mudaram depois da revisao (`upToDate` falso) e ainda ha revisoes hoje.
 */
export function NotesReviewCard({
  review,
  dayLabel,
  canReviewAgain,
  limitReached,
  busy,
  onReviewAgain,
}: {
  review: NotesReviewDto;
  dayLabel: string;
  canReviewAgain: boolean;
  limitReached: boolean;
  busy: boolean;
  onReviewAgain: () => void;
}) {
  const parts = [
    { title: 'O que está bom', icon: checkIcon, tone: 'text-accent', text: review.strengths },
    { title: 'O que falta', icon: shieldIcon, tone: 'text-project', text: review.missing },
    { title: 'Confere com o material?', icon: lockIcon, tone: 'text-project', text: review.materialCheck },
  ];
  const hint = !review.upToDate
    ? 'As notas mudaram desde a revisão'
    : 'Edite uma nota pra revisar de novo';
  return (
    <section className="flex flex-col gap-2.5 border-2 border-accent bg-[#1c9e3e]/10 px-4 py-3.5" aria-label={`Revisão da IA: ${dayLabel}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel-label text-[9px] text-accent">// Revisão da IA · {dayLabel}</p>
        <p className="font-pixel-label text-[7px] text-muted">Não vale nota</p>
      </div>
      {parts.map((p) => (
        <div key={p.title} className="flex gap-2.5">
          <img src={p.icon} alt="" className="mt-0.5 size-4 shrink-0 pixelated" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={`font-pixel-label text-[8px] ${p.tone}`}>{p.title}</p>
            {/* Markdown leve: a IA as vezes usa `crase` e **negrito**, igual as notas. */}
            <div className={PIXEL_PROSE}>
              <MarkdownBlock text={p.text} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="font-pixel-label text-[7px] text-muted">
          Revisada {reviewedAgo(review.createdAt)} · {review.noteCount} {review.noteCount === 1 ? 'nota' : 'notas'} · {limitReached ? 'sem revisões hoje, volta amanhã' : hint}
        </p>
        <button
          type="button"
          onClick={onReviewAgain}
          disabled={!canReviewAgain || busy}
          className="border-2 border-accent px-3 py-2 font-pixel-label text-[8px] leading-none text-accent hover:bg-accent/10 disabled:border-muted disabled:text-muted disabled:hover:bg-transparent"
        >
          {busy ? 'Revisando...' : 'Revisar de novo'}
        </button>
      </div>
    </section>
  );
}

/** Enquanto a IA le as notas e o material (Figma quadro 02). */
export function NotesReviewLoading({ dayNumber }: { dayNumber: number | null }) {
  return (
    <div className="flex items-center gap-3 border-2 border-dashed border-muted px-3.5 py-3" role="status">
      <img src={focadaNeutra} alt="" className="size-8 pixelated" />
      <p className="font-pixel text-[19px] leading-tight text-secondary">
        Lendo suas notas e o material do dia {dayNumber !== null ? String(dayNumber).padStart(2, '0') : ''}, agente. Uns segundos.
      </p>
    </div>
  );
}
