import type { StatusBadgeTone } from '../lib/statusBadge';

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  muted: 'bg-surface-alt text-muted',
  accent: 'border border-accent bg-accent/25 text-primary',
  project: 'border border-project bg-project/25 text-primary',
  alert: 'bg-surface-alt text-alert',
};

/**
 * Badge de status generico (Fase 8) - so apresentacao, o chamador decide icone/rotulo/tom pro seu
 * proprio enum (DailyStatus, WeeklyProjectStatus, etc). Evita 1 componente so tentando conhecer
 * todos os enums de status do dominio. Mapeamento de DailyStatus -> props vive em
 * lib/statusBadge.ts (nao aqui), pra nao co-exportar funcao/componente do mesmo arquivo.
 *
 * Fase 20: tons accent/project ganharam preenchimento translucido + borda (era so texto colorido
 * sobre bg neutro) - mesmo padrao "accent-dim" ja estabelecido na Fase 19 (OptionCard selecionado,
 * badges do Roleplay/Ligar Palavras) pra pills de destaque real (nao neutro/erro).
 */
export function StatusBadge({ icon, label, tone = 'muted' }: { icon: string; label: string; tone?: StatusBadgeTone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
