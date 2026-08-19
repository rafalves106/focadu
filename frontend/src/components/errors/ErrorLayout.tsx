import type { ReactNode } from 'react';

/**
 * Chrome compartilhado pelas 4 telas de erro (Fase 10, design Figma "Erro - Sem Conexao" - unico
 * dos 4 links do prompt cujo conteudo batia com o nome: os outros 3 apontavam pra "Sessao
 * Expirada" (conceito de sessao/login que este app nao tem), "Resposta Incorreta" (variante de
 * feedback de quiz, nao um erro) e "Streak Perdido" (gamificacao, em standby desde a Fase 6/7) -
 * ver docs/fase-10 pra detalhes). Reaproveita o mesmo padrao visual (icone num frame, titulo,
 * descricao, CTA primario + secundario) nas 4 telas, sem duplicar o layout.
 */
export function ErrorLayout({
  icon,
  caption,
  title,
  description,
  primaryAction,
  secondaryAction,
  extra,
}: {
  icon: ReactNode;
  /** Legenda pequena abaixo do icone, ex: "PING TIMEOUT" no design original - opcional. */
  caption?: string;
  title: string;
  description: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  /** Conteudo extra entre a descricao e os botoes (ex: spinner do TimeoutError). */
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 p-10 text-center">
      <div className="flex size-[140px] flex-col items-center justify-center gap-3 rounded-3xl border border-surface-alt bg-surface">
        <div className="text-5xl" aria-hidden="true">
          {icon}
        </div>
        {caption && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{caption}</p>}
      </div>

      <div className="flex max-w-lg flex-col gap-3">
        <h1 className="text-3xl font-bold text-primary">{title}</h1>
        <p className="text-base leading-relaxed text-secondary">{description}</p>
      </div>

      {extra}

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="w-80 rounded-xl bg-accent px-8 py-4 text-sm font-bold tracking-wide text-base"
        >
          {primaryAction.label.toUpperCase()}
        </button>
        {secondaryAction && (
          <button type="button" onClick={secondaryAction.onClick} className="text-xs font-semibold tracking-wide text-secondary hover:text-primary">
            {secondaryAction.label.toUpperCase()}
          </button>
        )}
      </div>
    </div>
  );
}
