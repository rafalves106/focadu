import type { ReactNode } from 'react';

/** Bloco "// TITULO" + conteudo - usado no guarda-roupa e na lista de conquistas (eram abas do Perfil ate a Fase 72). */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-pixel-label text-[9px] text-accent">// {title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
