import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import focadaNeutra from '../assets/pixel/focada-neutra.png';
import focadaComemorando from '../assets/pixel/focada-comemorando.png';
import focadaAcolhedora from '../assets/pixel/focada-acolhedora.png';
import type { FocadaExpression, FocadaLine } from '../lib/focadaLines';
import { playAdvance, playTypingBlip } from '../lib/uiSound';

const PORTRAITS: Record<FocadaExpression, string> = {
  neutra: focadaNeutra,
  comemorando: focadaComemorando,
  acolhedora: focadaAcolhedora,
};

/** Velocidade unica da digitacao (decisao do dono: padrao, sem configuracao). */
const TYPING_MS_PER_CHAR = 28;
/** Blip a cada N letras - um por letra fica metralhadora. */
const BLIP_EVERY = 3;

function seenKey(projectId: string) {
  return `focadu:focada-vistas:${projectId}`;
}

function loadSeen(projectId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(projectId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(projectId: string, seen: Set<string>) {
  try {
    localStorage.setItem(seenKey(projectId), JSON.stringify([...seen]));
  } catch {
    // Sem armazenamento (aba privada/bloqueado): so volta a digitar na proxima visita.
  }
}

/** Opcao de resposta do agente (Fase 64) - ex.: "Entregar projeto". */
export interface DialogueChoice {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Dialogo da Focada (Fase 64, ver secret/rascunhos/projeto-semanal-dialogo-de-jogo.md) - fica o tempo
 * todo na tela do Projeto Semanal, no lugar do cartao de especificacao (que foi pro README.md do
 * repositorio). Caixa pixel art (`pixel-box`), retrato 32x32 a 3x, nome em Silkscreen e fala em VT323.
 *
 * - Cada fala e "digitada" so na 1a vez que aparece (textos ja vistos ficam em `localStorage` por
 *   projeto); depois vem inteira. Com `prefers-reduced-motion`, nunca digita.
 * - Abre na 1a fala ainda nao vista - ou na ultima (o estado atual do projeto) se ja viu todas.
 * - Clique/Enter/espaco: completa a fala que esta sendo digitada, ou avanca. "Pular" vai direto pra
 *   ultima (e marca as puladas como vistas).
 * - Terminada a ultima fala, a caixa vira a conversa inteira em lista (pedido do dono: sem rever uma
 *   por uma, e ocupa a altura do centro da tela) - as anteriores em cinza, a atual em destaque.
 * - `choices`: opcoes de resposta do agente (estilo RPG), numa caixa a direita que so aparece depois
 *   que a Focada termina de falar. `choicesNote` = aviso embaixo delas (ex.: erro ao entregar).
 * - Leitor de tela recebe a fala inteira (regiao aria-live), nunca letra por letra.
 * - Sons sintetizados (lib/uiSound.ts), obedecem "Sons da interface" nas Configuracoes. Sem voz.
 * - `stacked` (Fase 65, mapa da trilha): retrato em cima da caixa em vez de ao lado - pra coluna
 *   estreita a esquerda do mapa.
 * - `compact` (tela de start, 23/09/2026): retrato 64px e fala menor - a caixa divide o centro da tela
 *   com a missao do dia e o caminho da semana e precisa caber sem rolar.
 */
export function DialogueBox({
  projectId,
  lines,
  readmeUrl,
  choices = [],
  choicesNote = null,
  stacked = false,
  compact = false,
}: {
  projectId: string;
  stacked?: boolean;
  compact?: boolean;
  lines: FocadaLine[];
  readmeUrl: string | null;
  choices?: DialogueChoice[];
  choicesNote?: string | null;
}) {
  const texts = useMemo(() => lines.map((l) => l.text), [lines]);
  // Conjunto mutavel criado 1x por montagem (o componente remonta por `key` quando o projeto muda).
  const [seen] = useState(() => loadSeen(projectId));
  const [index, setIndex] = useState(() => {
    const firstUnseen = texts.findIndex((t) => !seen.has(t));
    return firstUnseen === -1 ? Math.max(0, texts.length - 1) : firstUnseen;
  });
  const current = lines[Math.min(index, lines.length - 1)];
  const [shown, setShown] = useState(() =>
    current && (seen.has(current.text) || prefersReducedMotion()) ? current.text.length : 0,
  );
  const typing = current !== undefined && shown < current.text.length;
  const isLast = index >= lines.length - 1;
  const finished = isLast && !typing;

  const markSeen = useCallback(
    (...toMark: string[]) => {
      toMark.forEach((t) => seen.add(t));
      saveSeen(projectId, seen);
    },
    [projectId, seen],
  );

  // Digitacao: 1 letra por tick; marca como vista quando termina.
  useEffect(() => {
    if (!current) return;
    if (shown >= current.text.length) {
      markSeen(current.text);
      return;
    }
    const timer = window.setTimeout(() => {
      setShown((n) => n + 1);
      if (shown % BLIP_EVERY === 0 && current.text[shown] !== ' ') playTypingBlip();
    }, TYPING_MS_PER_CHAR);
    return () => window.clearTimeout(timer);
  }, [current, shown, markSeen]);

  function goTo(next: number) {
    const line = lines[next];
    setIndex(next);
    setShown(seen.has(line.text) || prefersReducedMotion() ? line.text.length : 0);
  }

  function advance() {
    if (!current) return;
    if (typing) {
      setShown(current.text.length);
      return;
    }
    if (!isLast) {
      playAdvance();
      goTo(index + 1);
    }
  }

  function skip() {
    markSeen(...texts.slice(0, lines.length - 1));
    playAdvance();
    goTo(lines.length - 1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // Enter num botao/link interno faz a acao dele
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      advance();
    }
  }

  if (!current) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Digitando: retrato alinhado embaixo, junto da fala. Em lista: retrato no topo e fixo enquanto a
          conversa rola dentro do cartao (ScrollArea do WeeklyProjectPage). */}
      <div className={stacked ? 'flex flex-col items-start gap-4' : `flex gap-4 ${finished ? 'items-start' : 'items-end'}`}>
        <div className={`pixel-box hidden shrink-0 bg-surface p-2 sm:block ${finished && !stacked ? 'sticky top-0' : ''}`}>
          <img src={PORTRAITS[current.expression]} alt="" className={`${compact ? 'size-16' : 'size-24'} pixelated`} aria-hidden="true" />
        </div>

        <div
          role="group"
          aria-label="Diálogo da Focada"
          tabIndex={finished ? undefined : 0}
          onClick={finished ? undefined : advance}
          onKeyDown={finished ? undefined : onKeyDown}
          className={`pixel-box flex min-w-0 flex-1 flex-col bg-base ${stacked ? 'w-full px-5' : 'px-6'} ${compact ? 'gap-2 pt-4 pb-3' : 'gap-3 pt-5 pb-4'} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
            finished ? '' : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-3">
            <img src={PORTRAITS[current.expression]} alt="" className="size-8 pixelated sm:hidden" aria-hidden="true" />
            <span className="font-pixel-label text-sm text-accent">Focada</span>
            {!finished && (
              <span className="ml-auto font-pixel-label text-[10px] text-muted">
                {index + 1}/{lines.length}
              </span>
            )}
          </div>

          {finished ? (
            <div className="flex flex-col gap-4">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className={`font-pixel ${compact ? 'text-xl' : 'text-[22px] lg:text-2xl'} leading-snug ${i === lines.length - 1 ? 'text-primary' : 'text-secondary'}`}
                >
                  {line.text}
                </p>
              ))}
            </div>
          ) : (
            // Texto inteiro invisivel reserva a altura final - a caixa nao "pula" enquanto digita.
            <p className={`relative font-pixel leading-snug text-primary ${compact ? 'text-xl' : 'text-[22px] lg:text-2xl'}`}>
              <span className="invisible">{current.text}</span>
              <span className="absolute inset-0" aria-hidden="true">
                {current.text.slice(0, shown)}
              </span>
            </p>
          )}
          <p className="sr-only" aria-live="polite">
            {current.text}
          </p>

          {/* compact: o rodape so aparece quando tem o que mostrar (link/Pular) - sem ele a caixa cabe no centro do start. */}
          <div className={`flex min-h-6 items-center gap-4 font-pixel-label text-[11px] ${compact && !readmeUrl && isLast ? 'hidden' : ''}`}>
            {readmeUrl && (
              <a
                href={readmeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-project hover:underline"
              >
                Abrir README.md
              </a>
            )}
            <span className="ml-auto flex items-center gap-4">
              {!isLast && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    skip();
                  }}
                  className="text-secondary hover:text-primary"
                >
                  Pular
                </button>
              )}
              {!typing && !isLast && <span className="animate-pulse text-base text-accent" aria-hidden="true">▼</span>}
            </span>
          </div>
        </div>
      </div>

      {finished && choices.length > 0 && (
        <div className="flex justify-end">
          <div role="group" aria-label="Sua resposta" className="pixel-box flex min-w-0 flex-col items-end gap-2 bg-base px-6 pt-4 pb-4 sm:min-w-[55%]">
            {/* Lado do agente espelha o da Focada: nome e seta de escolha alinhados a direita. */}
            <span className="font-pixel-label text-sm text-project">Você</span>
            {choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                onClick={choice.onSelect}
              // mesmo cursor unico da confirmacao: o mouse move o foco, o destaque vem so do foco
              onMouseEnter={(e) => e.currentTarget.focus()}
                disabled={choice.disabled}
                className="group flex items-baseline gap-2 text-right font-pixel text-[22px] leading-snug text-primary focus:text-project focus:outline-none disabled:opacity-50 lg:text-2xl"
              >
                {choice.label}
                <span className="text-project opacity-0 group-focus:opacity-100" aria-hidden="true">
                  ◀
                </span>
              </button>
            ))}
            {choicesNote && <p className="text-right font-pixel text-lg text-alert">{choicesNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
