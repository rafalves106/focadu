import type { StatusBadgeTone } from '../lib/statusBadge';

const TONE_CLASS: Record<StatusBadgeTone, string> = {
  muted: 'bg-surface-alt text-muted',
  accent: 'bg-accent/10 text-accent',
  project: 'bg-project/10 text-project',
  alert: 'bg-surface-alt text-alert',
};

/**
 * Badge de status generico (Fase 8) - so apresentacao, o chamador decide icone/rotulo/tom pro seu
 * proprio enum (DailyStatus, WeeklyProjectStatus, etc). Evita 1 componente so tentando conhecer
 * todos os enums de status do dominio. Mapeamento de DailyStatus -> props vive em
 * lib/statusBadge.ts (nao aqui), pra nao co-exportar funcao/componente do mesmo arquivo.
 */
export function StatusBadge({ icon, label, tone = 'muted' }: { icon: string; label: string; tone?: StatusBadgeTone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone]}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
