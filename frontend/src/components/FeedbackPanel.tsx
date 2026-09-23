import type { ReactNode } from 'react';
import type { TerminalQuality } from '../api/types';
import { REINFORCEMENT_CREATED, feedbackLine } from '../lib/focadaSessionLines';
import { useSession } from '../lib/sessionContext';
import { useSessionKeys } from '../lib/useSessionKeys';
import { SessionFooter } from './SessionShell';
import { FocadaSays } from './session/FocadaSays';
import { PixelButton, PixelChip } from './session/PixelButton';
import reinforcementIcon from '../assets/pixel/mapa/badge-reforco.png';

/**
 * Resultado de uma etapa avaliada (Fase 7, redesenhado na Fase 68 - Figma "Daily — redesign
 * proposto"): a Focada reage no lugar do antigo painel com gauge circular. Por padrao a fala dela vai
 * pro rodape fixo junto do "Continuar" (Quiz, Lacuna, Ligar, Roleplay); no Resumo Falado
 * (`focadaInContent`) o feedback da IA e longo e fica no conteudo, com a nota grande em cima.
 *
 * No erro que completa o conta-giros (`penaltyPoints === penaltyThreshold`), avisa que o reforco foi
 * criado, que ele nao gasta a sessao do dia e onde encontrar - antes isso so aparecia na conclusao.
 * Enter continua (mesmo atalho das opcoes).
 */
export function FeedbackPanel({
  passed,
  score,
  showScore = false,
  transcript,
  aiFeedback,
  detail,
  roleplayQuality,
  seed,
  focadaInContent = false,
  onContinue,
}: {
  passed: boolean;
  score: number;
  /** Nota em destaque - so faz sentido onde ha nota parcial (Resumo Falado, Ligar Palavras). */
  showScore?: boolean;
  transcript?: string | null;
  aiFeedback?: string | null;
  /** Linha extra especifica do tipo (ex: resposta esperada da lacuna). */
  detail?: ReactNode;
  roleplayQuality?: TerminalQuality | null;
  /** Escolhe a variante da fala padrao (id da atividade: mesma fala a cada render). */
  seed: string;
  focadaInContent?: boolean;
  onContinue?: () => void;
}) {
  const { daily } = useSession();
  const reinforcementNow =
    !passed && !daily.isReinforcement && daily.penaltyThreshold > 0 && daily.penaltyPoints === daily.penaltyThreshold;
  const errorLabel = !passed && !daily.isReinforcement ? ` · erro ${Math.min(daily.penaltyPoints, daily.penaltyThreshold)} de ${daily.penaltyThreshold}` : '';

  useSessionKeys((key) => {
    if (key === 'Enter' && onContinue) onContinue();
  }, !!onContinue);

  const focada = (
    <FocadaSays
      expression={passed ? 'comemorando' : 'acolhedora'}
      label={`Focada${errorLabel}`}
      size={focadaInContent ? 'md' : 'sm'}
      tone={focadaInContent && passed ? 'accent' : 'metal'}
      className={focadaInContent ? '' : 'min-w-0 flex-1 basis-80'}
    >
      {reinforcementNow ? REINFORCEMENT_CREATED : (aiFeedback ?? feedbackLine(passed, seed, roleplayQuality))}
    </FocadaSays>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        {showScore && <p className={`font-pixel text-7xl leading-none ${passed ? 'text-accent' : 'text-alert'}`}>{score}</p>}
        <div className="flex flex-col gap-2">
          <PixelChip tone={passed ? 'accent' : 'alert'}>{passed ? (showScore ? 'Aprovado · mínimo 80' : 'Acertou') : showScore ? 'Abaixo de 80' : 'Errou'}</PixelChip>
          {showScore && <p className="font-pixel text-lg leading-tight text-secondary">Nota única que pondera correção e clareza.</p>}
        </div>
      </div>

      {detail}

      {focadaInContent && focada}

      {transcript && (
        <details className="border-2 border-stroke bg-surface px-4 py-3">
          <summary className="cursor-pointer font-pixel-label text-[9px] text-secondary">O que você disse</summary>
          <p className="mt-2 font-pixel text-lg leading-tight text-primary">“{transcript}”</p>
        </details>
      )}

      {reinforcementNow && (
        <div className="flex items-center gap-3 border-2 border-alert px-4 py-3">
          <img src={reinforcementIcon} alt="" className="size-8 shrink-0 pixelated" />
          <div className="flex flex-col gap-1">
            <p className="font-pixel-label text-[10px] text-alert">Reforço do dia {daily.dayNumber} criado</p>
            <p className="font-pixel text-lg leading-tight text-secondary">
              As etapas que você errou viram uma sessão curta. Ela fica no mapa e no start até você fazer — e não gasta a sessão do dia.
            </p>
          </div>
        </div>
      )}

      <SessionFooter>
        {!focadaInContent && focada}
        {onContinue && <PixelButton onClick={onContinue}>Continuar ›</PixelButton>}
      </SessionFooter>
    </>
  );
}
