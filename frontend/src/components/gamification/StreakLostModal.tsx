import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import focadaAcolhedora from '../../assets/pixel/focada-acolhedora.png';
import fireIcon from '../../assets/pixel/chama-streak.png';

/**
 * "Streak Perdido" (Fase 10 retomada; Focada em pixel art desde 23/09/2026, pedido do dono) - a
 * Focada anuncia a quebra no mesmo formato do `PixelConfirmDialog`: retrato, fala numa `pixel-box` e
 * a resposta do agente embaixo. Voz (secret/curadoria/GUIA-DE-VOZ-FOCADA.md): streak perdido e
 * momento que doi, entao ela acolhe - sem sarcasmo, chama de "agente".
 *
 * Disparada pelo `StartDashboard` no load quando `GamificationSummaryDto.streakJustBroken` vem true.
 * Fechar de qualquer jeito (botao, Esc, clique fora) chama `api.acknowledgeStreakBreak()` - "marcar
 * como visto". Aparece uma vez por quebra: o backend zera o streak persistido ao marcar a quebra
 * (`UserStreak.CurrentStreakAsOf`), entao o reconhecimento nao e desfeito na leitura seguinte (bug
 * real de 23/09/2026: o aviso voltava a cada abertura da tela de start).
 */
export function StreakLostModal({ longestStreak, onClose }: { longestStreak: number; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  async function acknowledgeAndClose() {
    if (busy) return;
    setBusy(true);
    try {
      await api.acknowledgeStreakBreak();
    } catch {
      // "Marcar como visto" e melhor esforco - uma falha de rede aqui nao pode travar o usuario
      // numa tela que ele ja esta tentando fechar; na pior hipotese a tela repete na proxima visita.
    } finally {
      onClose();
    }
  }

  // Ultima versao do fechamento numa ref: o listener de Esc e registrado uma vez so, ao abrir.
  const closeRef = useRef(acknowledgeAndClose);
  useEffect(() => {
    closeRef.current = acknowledgeAndClose;
  });

  useEffect(() => {
    buttonRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') void closeRef.current();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const days = `${longestStreak} ${longestStreak === 1 ? 'dia' : 'dias'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 p-4 backdrop-blur-sm"
      onClick={() => void acknowledgeAndClose()}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="streak-lost-title"
        aria-describedby="streak-lost-message"
        className="flex w-full max-w-2xl flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-end gap-4">
          <div className="pixel-box hidden shrink-0 bg-surface p-2 sm:block">
            <img src={focadaAcolhedora} alt="" className="size-24 pixelated" aria-hidden="true" />
          </div>
          <div className="pixel-box flex min-w-0 flex-1 flex-col gap-3 bg-base px-6 pt-5 pb-5">
            <div className="flex items-center gap-3">
              <img src={focadaAcolhedora} alt="" className="size-8 pixelated sm:hidden" aria-hidden="true" />
              <span className="font-pixel-label text-sm text-accent">Focada</span>
              <span id="streak-lost-title" className="ml-auto flex items-center gap-1.5 font-pixel-label text-[10px] text-alert">
                <img src={fireIcon} alt="" className="size-4 pixelated grayscale" aria-hidden="true" />
                Streak perdido
              </span>
            </div>
            <p id="streak-lost-message" className="font-pixel text-[22px] leading-snug text-primary lg:text-2xl">
              Seu streak zerou, agente. Acontece com todo mundo. O recorde de {days} continua seu, e hoje é um bom dia pra
              começar o próximo.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <div role="group" aria-label="Sua resposta" className="pixel-box flex min-w-0 flex-col items-end gap-3 bg-base px-6 pt-4 pb-4 sm:min-w-[55%]">
            <span className="font-pixel-label text-sm text-project">Você</span>
            <button
              ref={buttonRef}
              type="button"
              disabled={busy}
              onClick={() => void acknowledgeAndClose()}
              className="group flex items-baseline gap-2 text-right font-pixel text-[22px] leading-snug text-primary focus:text-project focus:outline-none disabled:opacity-50 lg:text-2xl"
            >
              Bora recomeçar hoje
              <span className="text-project opacity-0 group-focus:opacity-100" aria-hidden="true">
                ◀
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
