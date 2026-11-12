/**
 * "Fio" do redesign v1 (Fase 109; Figma `12:324`): diz onde o aluno está, acima do título de toda tela
 * interna — `Curso · Semana · Dia · Etapa`. Passe só os segmentos que se aplicam; o último fica em
 * verde. Nunca numeração interna ("Dia 8" numa semana de 6 dias): reforço é "Reforço do Dia 1".
 */
export function Breadcrumb({ parts }: { parts: string[] }) {
  const shown = parts.filter(Boolean);
  return (
    <nav aria-label="Onde você está" className="text-rotulo-sm">
      <ol className="flex flex-wrap items-center gap-2">
        {shown.map((part, i) => {
          const last = i === shown.length - 1;
          return (
            <li key={`${i}-${part}`} className="flex items-center gap-2">
              {i > 0 && (
                <span aria-hidden="true" className="text-muted">
                  ·
                </span>
              )}
              <span className={last ? 'text-accent' : 'text-secondary'} aria-current={last ? 'location' : undefined}>
                {part}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
