/**
 * Bloco "em breve" (Fase 25, a pedido do Falves) - Loja/Customização pausadas ate ele montar um
 * kit inicial de pixel art de verdade pros cosmeticos (hoje sao blocos de cor solida por raridade,
 * placeholder desde a Fase 17). Mesmo espirito do `ComingSoonBadge` do SettingsMenu (Fase 7), so
 * que como bloco de secao inteira em vez de selo ao lado de um item - a Loja/Customizacao SAO o
 * conteudo da tela, nao um item a mais dentro dela.
 */
export function ComingSoon({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stroke bg-surface px-6 py-16 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <p className="text-base font-semibold text-primary">{title}</p>
      <p className="max-w-sm text-sm text-secondary">{description}</p>
    </div>
  );
}
