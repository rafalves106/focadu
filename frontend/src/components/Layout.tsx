/**
 * Texto centralizado de carregamento/estado (Fase 7). O `PageShell` que morava aqui saiu na Fase 74:
 * Certificacoes e Caderninho, as ultimas telas nele, viraram pixel art (ver components/PixelPage.tsx).
 */
export function Centered({ text, tone = 'secondary' }: { text: string; tone?: 'secondary' | 'alert' }) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--nav-height))] items-center justify-center p-6 text-center lg:min-h-0 lg:flex-1">
      <p className={`font-pixel text-2xl ${tone === 'alert' ? 'text-alert' : 'text-secondary'}`}>{text}</p>
    </div>
  );
}
