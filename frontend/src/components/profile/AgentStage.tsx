import { useEffect, useState } from 'react';
import { CosmeticSlot } from '../../api/types';
import { frameRect, itemSheet, SHEET_HEIGHT, SHEET_WIDTH, type AgentLook, type LayerSlot } from '../../lib/agentSprites';
import { AgentSprite } from '../agent/AgentSprite';
import { SegmentedBar } from '../SegmentedBar';
import { PixelStage } from '../squad/pixelStage';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Onde cada peca fica no quadro 32x32 da vista de frente (centro em pixels do sprite) - o slot mostra
 * so aquele pedaco, ampliado 3x e centralizado, como no Figma.
 */
const SLOT_CENTER: Record<LayerSlot, number> = {
  [CosmeticSlot.Hair]: 7,
  [CosmeticSlot.Top]: 17,
  [CosmeticSlot.Bottom]: 24,
  [CosmeticSlot.Shoes]: 29,
};

const SLOTS: { slot: LayerSlot; label: string }[] = [
  { slot: CosmeticSlot.Hair, label: 'Cabeça' },
  { slot: CosmeticSlot.Top, label: 'Parte de cima' },
  { slot: CosmeticSlot.Bottom, label: 'Parte de baixo' },
  { slot: CosmeticSlot.Shoes, label: 'Tênis' },
];

export interface CourseLine {
  name: string;
  region: number | null;
  completed: number;
  total: number;
}

/**
 * Palco do agente (Fase 72, Figma "Perfil + Squad — v2", node 120:4503) - o centro do Perfil: o agente
 * em pixel art grande sob o holofote, os 4 slots do que esta vestindo em volta (clicar abre o
 * guarda-roupa), nome, curso ativo com o progresso em blocos e os botoes. Sem agente criado ainda, o
 * palco convida a criar (o criador abre no mesmo guarda-roupa).
 */
export function AgentStage({
  displayName,
  since,
  look,
  course,
  onWardrobe,
  onSettings,
}: {
  displayName: string;
  since: string;
  look: AgentLook | null;
  course: CourseLine | null;
  onWardrobe: () => void;
  onSettings: () => void;
}) {
  const sinceDate = new Date(since);
  const { scale, slotBox } = useStageScale();
  const left = SLOTS.slice(0, 2);
  const right = SLOTS.slice(2);

  return (
    <section className="flex flex-col border-2 border-accent/60 bg-base shadow-[6px_6px_0_0_#1c9e3e] lg:min-h-0 lg:w-[36%] lg:max-w-[520px] lg:shrink-0 xl:w-[40%]">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 className="font-pixel-label text-[10px] text-accent">// Agente</h2>
        <span className="border-2 border-stroke px-2.5 py-1 font-pixel-label text-[7px] text-secondary">
          Desde {MONTHS[sinceDate.getMonth()]}/{sinceDate.getFullYear()}
        </span>
      </div>

      <PixelStage className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:justify-end" floor="bottom-[104px] sm:bottom-3" steps={10}>
        <div className="flex items-center justify-center gap-3 px-4 pt-4 pb-8 sm:gap-6 lg:gap-2 lg:px-2 xl:gap-6 xl:px-4 lg:short:pb-6">
          <div className="hidden flex-col gap-8 sm:flex">
            {left.map((s) => (
              <Slot key={s.slot} {...s} look={look} onClick={onWardrobe} box={slotBox} />
            ))}
          </div>
          <div className="flex flex-col items-center">
            {look ? (
              <AgentSprite look={look} scale={scale} />
            ) : (
              <button
                type="button"
                onClick={onWardrobe}
                className="flex size-48 flex-col items-center justify-center gap-3 border-2 border-dashed border-accent/60 font-pixel text-2xl leading-tight text-accent hover:bg-accent/10"
              >
                <span className="text-5xl">?</span>
                Crie seu agente ›
              </button>
            )}
            {/* Pedestal proporcional ao agente, pra caber entre os slots em qualquer escala. */}
            <span className="-mt-1 block h-3 max-w-full border-t-4 border-accent bg-accent/60" style={{ width: 28 * scale }} aria-hidden="true" />
            <span className="block h-2.5 max-w-full bg-stroke" style={{ width: 34 * scale }} aria-hidden="true" />
          </div>
          <div className="hidden flex-col gap-8 sm:flex">
            {right.map((s) => (
              <Slot key={s.slot} {...s} look={look} onClick={onWardrobe} box={slotBox} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pb-4 sm:hidden">
          {SLOTS.map((s) => (
            <Slot key={s.slot} {...s} look={look} onClick={onWardrobe} compact />
          ))}
        </div>
      </PixelStage>

      <div className="flex flex-col gap-3 px-5 pt-4 pb-5 lg:shrink-0 lg:short:gap-2 lg:short:pt-2 lg:short:pb-4">
        <p className="text-center font-pixel-label text-[34px] leading-none lg:tight:text-[28px] break-words text-primary uppercase">{displayName}</p>
        {course && (
          <>
            <p className="text-center font-pixel text-[22px] leading-none text-secondary">
              {course.name}
              {course.region !== null && ` · Região ${course.region}`}
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between font-pixel-label text-[8px]">
                <span className="text-accent">
                  {course.completed} de {course.total} dias
                </span>
                <span className="text-secondary">{course.total ? Math.round((course.completed / course.total) * 100) : 0}%</span>
              </div>
              <SegmentedBar percentage={course.total ? (course.completed / course.total) * 100 : 0} label={`Progresso em ${course.name}`} segments={24} heightClass="h-3" />
            </div>
          </>
        )}
        <div className="mt-1 grid grid-cols-2 gap-3">
          <button type="button" onClick={onWardrobe} className="border-2 border-accent bg-accent px-3 py-3.5 font-pixel-label text-[10px] leading-none text-base hover:brightness-110">
            {look ? 'Trocar visual ›' : 'Criar agente ›'}
          </button>
          <button type="button" onClick={onSettings} className="border-2 border-accent px-3 py-3.5 font-pixel-label text-[10px] leading-none text-accent hover:bg-accent/10">
            Configurações ›
          </button>
        </div>
      </div>
    </section>
  );
}

/** 8x so em tela grande e alta (desktop largo), 6x/5x no resto - sempre escala inteira. */
function useStageScale(): { scale: number; slotBox: number } {
  // 5x em janela baixa (1280x720) ou no desktop estreito (1024-1279), pra os slots caberem dos lados;
  // no desktop estreito os slots tambem encolhem (56px), senao vazam do palco.
  const pick = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const narrow = w >= 1024 && w < 1280;
    return { scale: w >= 1400 && h >= 860 ? 8 : narrow || (w >= 1024 && h < 760) ? 5 : 6, slotBox: narrow ? 56 : 72 };
  };
  const [value, setValue] = useState(pick);
  useEffect(() => {
    const onResize = () => setValue(pick());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return value;
}

/** Slot de equipamento: so o pedaco do sprite onde a peca fica, ampliado 3x. */
function Slot({ slot, label, look, onClick, compact = false, box: boxSize = 72 }: { slot: LayerSlot; label: string; look: AgentLook | null; onClick: () => void; compact?: boolean; box?: number }) {
  const code = look?.layers[slot] ?? null;
  const sheet = code ? itemSheet(code) : undefined;
  const { x, y } = frameRect({ view: 'frente' });
  const scale = 3;
  const box = compact ? 64 : boxSize;
  const offsetX = box / 2 - 16 * scale;
  const offsetY = box / 2 - SLOT_CENTER[slot] * scale;
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5" title={`${label} - trocar`}>
      <span className="relative overflow-hidden border-2 border-secondary/60 bg-stroke/40 group-hover:border-accent" style={{ width: box, height: box }}>
        {sheet ? (
          <span
            aria-hidden="true"
            className="absolute pixelated"
            style={{
              left: offsetX,
              top: offsetY,
              width: 32 * scale,
              height: 32 * scale,
              backgroundImage: `url(${sheet})`,
              backgroundSize: `${SHEET_WIDTH * scale}px ${SHEET_HEIGHT * scale}px`,
              backgroundPosition: `-${x * scale}px -${y * scale}px`,
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <span className="flex h-full items-center justify-center font-pixel text-2xl text-muted">—</span>
        )}
      </span>
      <span className="max-w-[84px] text-center font-pixel-label text-[7px] leading-tight text-secondary group-hover:text-accent">{label}</span>
    </button>
  );
}
