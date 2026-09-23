import type { DailyActivityDto } from '../../api/types';
import { blockIntro } from '../../lib/focadaSessionLines';
import { useSession } from '../../lib/sessionContext';
import { stepInfo } from '../../lib/sessionSteps';
import { useSessionKeys } from '../../lib/useSessionKeys';
import { SessionFooter, SessionLayout } from '../SessionShell';
import { FocadaSays } from './FocadaSays';
import { PixelButton, PixelChip } from './PixelButton';

/**
 * Apresentacao de um bloco de atividades (Fase 68, Figma "Daily — 11"): a Focada explica o bloco e
 * as regras viram chips, dentro da propria casca da sessao - substitui o antigo `IntroCard`, uma tela
 * solta sem menu lateral nem progresso. Aparece so na 1a atividade de cada bloco
 * (`isFirstOfActivityGroup`). Enter tambem comeca.
 */
export function BlockIntro({ activity, onStart }: { activity: DailyActivityDto; onStart: () => void }) {
  const { daily } = useSession();
  const info = stepInfo(daily, activity.id);
  const count = info?.stage.activities.length ?? 1;
  const intro = blockIntro(activity.type, activity.answerMode, count, daily.penaltyThreshold);

  useSessionKeys((key) => {
    if (key === 'Enter') onStart();
  });

  return (
    <SessionLayout centered sub={info?.sub ? `${count} no bloco` : ''}>
      <FocadaSays size="lg" label={`Focada · ${intro.title}`}>
        {intro.text}
      </FocadaSays>
      {intro.rules.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {intro.rules.map((rule) => (
            <PixelChip key={rule}>{rule}</PixelChip>
          ))}
        </div>
      )}
      <SessionFooter>
        <p className="font-pixel-label text-[8px] text-muted">Enter também começa</p>
        <PixelButton onClick={onStart}>Bora ›</PixelButton>
      </SessionFooter>
    </SessionLayout>
  );
}
