import { useEffect, type ReactNode } from 'react';
import { pauseSessionKeys } from '../../lib/useSessionKeys';

export interface RailItem {
  label: string;
  /** Sprite 16x16 do botao (assets/pixel). */
  icon?: string;
  /** Texto grande no lugar do sprite (o tempo do Pomodoro). */
  big?: string;
  /** Verde: algo rodando (Pomodoro). */
  live?: boolean;
  /** Ponto ambar: rascunho nao salvo, resposta nao lida. */
  dot?: boolean;
}

/**
 * Coluna lateral que se adapta a tela (Fase 91, Figma "Sessao em telas menores — v2"). Com espaco (`rails` falso)
 * e a coluna de sempre. Sem espaco (notebook: largura < 1440 ou altura < 820) vira um trilho de 64px e o mesmo
 * conteudo abre como gaveta de 340px por cima do centro - o conteudo fica montado o tempo todo (rascunho, conversa e
 * Pomodoro nao reiniciam ao fechar). O pai precisa ser `relative` (a gaveta se posiciona nele).
 */
export function SideSlot({
  side,
  rails,
  open,
  onToggle,
  onClose,
  items,
  guia,
  title,
  columnClassName,
  children,
}: {
  side: 'left' | 'right';
  rails: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  items: RailItem[];
  guia?: string;
  /** Nome da gaveta, pra leitor de tela. */
  title: string;
  columnClassName: string;
  children: ReactNode;
}) {
  if (!rails) {
    return (
      <aside data-guia={guia} className={columnClassName}>
        {children}
      </aside>
    );
  }
  return (
    <>
      <nav
        data-guia={guia}
        aria-label={title}
        className="pixel-box flex w-16 shrink-0 flex-col items-center gap-2 self-start bg-base px-1.5 py-2.5"
        data-testid={`rail-${side}`}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            title={item.label}
            className={`relative flex size-[52px] flex-col items-center justify-center gap-1 border-2 ${
              open ? 'border-accent' : 'border-stroke hover:border-secondary'
            }`}
          >
            {item.icon && <img src={item.icon} alt="" className="size-4 pixelated" />}
            {item.big && <span className={`font-pixel text-lg leading-none ${item.live ? 'text-accent' : 'text-primary'}`}>{item.big}</span>}
            <span className={`font-pixel-label text-[6px] leading-none ${open || item.live ? 'text-accent' : 'text-secondary'}`}>{item.label}</span>
            {item.dot && <span className="absolute top-1 right-1 size-1.5 bg-project" aria-label="novidade" />}
          </button>
        ))}
      </nav>
      <RailDrawer side={side} open={open} onClose={onClose} title={title}>
        {children}
      </RailDrawer>
    </>
  );
}

function RailDrawer({ side, open, onClose, title, children }: { side: 'left' | 'right'; open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  // Esc fecha e os atalhos da sessao (1-N, Enter) ficam pausados enquanto a gaveta esta aberta. O Esc e tratado na
  // captura e consumido: na sessao ele tambem abre as Configuracoes (useSessionExitGuard), e aqui so deve fechar a gaveta.
  useEffect(() => {
    if (!open) return;
    const resume = pauseSessionKeys();
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onClose();
    }
    window.addEventListener('keydown', onKey, true);
    return () => {
      resume();
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  return (
    // `invisible` (e nao `hidden`): o conteudo segue com tamanho medido - o campo do chat calcula a propria altura e
    // com display:none ficaria achatado ao abrir. Invisivel tambem sai da ordem do Tab.
    <div className={open ? '' : 'invisible'} aria-hidden={!open} data-testid={`drawer-${side}`}>
      <div className="fixed inset-x-0 bottom-0 top-[var(--nav-height)] z-30 bg-black/55" onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-label={title}
        className={`absolute top-0 bottom-0 z-40 flex w-[340px] flex-col gap-2 border-[3px] border-accent bg-base p-3.5 ${
          side === 'left' ? 'left-[76px] shadow-[6px_6px_0_0_#1c9e3e]' : 'right-[76px] shadow-[-6px_6px_0_0_#1c9e3e]'
        }`}
      >
        <button type="button" onClick={onClose} className="self-start font-pixel-label text-[8px] text-secondary hover:text-primary">
          ✕ Fechar · Esc
        </button>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}
