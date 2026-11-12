import { Link } from 'react-router-dom';

/** Um segmento do Fio: texto solto ou, quando dá pra voltar até ele, com link. */
export type BreadcrumbPart = string | { label: string; to: string } | null | undefined | false;

/**
 * "Fio" do redesign v1 (Fase 109; Figma `12:324`): diz onde o aluno está, acima do título de toda tela
 * interna — `Curso · Semana · Dia · Etapa`. Passe só os segmentos que se aplicam; o último fica em
 * verde. Nunca numeração interna ("Dia 8" numa semana de 6 dias): reforço é "Reforço do Dia 1".
 * Segmento com `to` (menos o último) vira link de volta.
 */
export function Breadcrumb({ parts }: { parts: BreadcrumbPart[] }) {
  const shown = parts.filter((p): p is string | { label: string; to: string } => Boolean(p));
  return (
    <nav aria-label="Onde você está" className="text-rotulo-sm">
      <ol className="flex flex-wrap items-center gap-2">
        {shown.map((part, i) => {
          const last = i === shown.length - 1;
          const label = typeof part === 'string' ? part : part.label;
          return (
            <li key={`${i}-${label}`} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
              )}
              {!last && typeof part !== 'string' ? (
                <Link to={part.to} className="text-secondary hover:text-primary">
                  {label}
                </Link>
              ) : (
                <span className={last ? 'text-accent' : 'text-secondary'} aria-current={last ? 'location' : undefined}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
