import { REINFORCEMENT_INTRO } from '../lib/focadaSessionLines';
import { useSession } from '../lib/sessionContext';
import { useSessionKeys } from '../lib/useSessionKeys';
import { SessionFooter, SessionLayout } from './SessionShell';
import { FocadaSays } from './session/FocadaSays';
import { PixelButton, PixelChip } from './session/PixelButton';
import gemIcon from '../assets/pixel/gema.png';

/**
 * Entrada de uma sessao de reforco (Fase 15; pixel art na Fase 68, Figma "Daily — 16") - primeira
 * coisa ao abrir uma Daily de reforco ainda sem resposta. Cartao em vermelho, a cadeia mostra so as
 * etapas clonadas, e a Focada explica o Bonus de Superacao. Sem alarmismo: erro e rota de revisao.
 */
export function ReinforcementIntroScreen({ onStart }: { onStart: () => void }) {
  const { daily } = useSession();
  const count = daily.activities.length;

  useSessionKeys((key) => {
    if (key === 'Enter') onStart();
  });

  return (
    <SessionLayout
      tone="alert"
      label={`Reforço do dia ${daily.dayNumber}`}
      sub={`${count} ${count === 1 ? 'etapa' : 'etapas'} · só o que você errou`}
      chain="step"
      showGauge={false}
      centered
    >
      <FocadaSays expression="acolhedora" size="lg" tone="alert" label="Focada · reforço">
        {REINFORCEMENT_INTRO}
      </FocadaSays>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 border-2 border-accent px-3 py-1.5 font-pixel-label text-[10px] text-accent">
          <img src={gemIcon} alt="" className="size-4 pixelated" />
          +2 se acertar tudo
        </span>
        <PixelChip>Não gasta a sessão do dia</PixelChip>
      </div>
      <SessionFooter>
        <p className="font-pixel-label text-[8px] text-muted">Enter também começa</p>
        <PixelButton tone="alert" onClick={onStart}>
          Começar reforço ›
        </PixelButton>
      </SessionFooter>
    </SessionLayout>
  );
}
