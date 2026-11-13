/** Cor dos quadrados cheios: erro do dia (vermelho), tentativa do passo (âmbar), missão cumprida (verde). */
export type DayGaugeTone = 'erro' | 'tentativa' | 'feito';

const FILL: Record<DayGaugeTone, string> = { erro: 'bg-alert', tentativa: 'bg-project', feito: 'bg-accent' };

/**
 * "Erros do dia" do redesign v1 (Fase 109 etapa 4; Figma `12:661`): rótulo, um quadrado de 8 por erro
 * possível e "1/3", na linha do fio. Só aparece depois do 1º erro (quem chama decide: não existe 0/3).
 * O mesmo desenho serve pras "Tentativas do passo" do code comigo e pras missões do terminal.
 */
export function DayGauge({ label, value, total, tone = 'erro', title }: { label: string; value: number; total: number; tone?: DayGaugeTone; title?: string }) {
  const shown = Math.min(value, total);
  return (
    <div className="flex shrink-0 items-center gap-2" title={title} aria-label={`${label}: ${shown} de ${total}`}>
      <span className="hidden text-rotulo-sm text-secondary md:inline">{label}</span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`size-2 ${i < shown ? FILL[tone] : 'bg-stroke'}`} />
        ))}
      </span>
      <span className="text-rotulo-sm text-primary">
        {shown}/{total}
      </span>
    </div>
  );
}
