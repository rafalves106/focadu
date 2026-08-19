import type { ReactNode } from 'react';

/**
 * Bloco de resultado compartilhado pelos 5 componentes de atividade (Fase 7, design "feedback-ia"
 * do Figma) - gauge circular de Score, inset com a resposta do usuario (quando houver transcript)
 * e feedback textual (quando houver aiFeedback), sempre terminando no botao "Continuar". So a
 * apresentacao foi unificada aqui - cada chamador continua decidindo seu proprio fluxo de submit/
 * revalidacao, isso so troca o JSX do "reveal" final.
 *
 * O design mostra 2 colunas (O que voce acertou / Onde melhorar) com bullets separados - simplificado
 * pra 1 bloco de texto porque o dominio so guarda 1 AiFeedback (string unica da Groq, ver
 * GroqContentEvaluationService), nao uma lista estruturada de acertos/erros.
 */
export function FeedbackPanel({
  passed,
  score,
  transcript,
  aiFeedback,
  detail,
  headline,
  onContinue,
}: {
  passed: boolean;
  score: number;
  transcript?: string | null;
  aiFeedback?: string | null;
  /** Linha extra especifica do tipo de atividade (ex: "Resposta esperada: cookie", "Qualidade do desfecho: Ideal"). */
  detail?: ReactNode;
  /** Texto do resultado - default cobre a maioria dos tipos; Roleplay usa uma copia propria ("Desfecho ideal!"). */
  headline?: { pass: string; fail: string };
  /** Omitido dentro de grupos (ex: cada termo do WordMatch) - quem chama decide quando mostrar "Continuar". */
  onContinue?: () => void;
}) {
  const { pass = 'Acertou! 🎉', fail = '❌ Quase lá.' } = headline ?? {};

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className={`font-semibold ${passed ? 'text-accent' : 'text-alert'}`}>{passed ? pass : fail}</p>
        <div
          className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-full ${
            passed ? 'bg-accent/10 text-accent' : 'bg-alert/10 text-alert'
          }`}
        >
          <span className="text-lg font-bold leading-none">{score}</span>
          <span className="text-[9px] font-medium uppercase tracking-wide">Score</span>
        </div>
      </div>

      {transcript && (
        <div className={`rounded-xl border border-surface-alt bg-surface-alt p-4`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sua resposta</p>
          <p className="mt-1 text-sm italic text-primary">{transcript}</p>
        </div>
      )}

      {aiFeedback && <p className="text-sm text-secondary">{aiFeedback}</p>}
      {detail}

      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="rounded-xl bg-accent px-4 py-3.5 text-sm font-bold tracking-wide text-base"
        >
          CONTINUAR →
        </button>
      )}
    </div>
  );
}
