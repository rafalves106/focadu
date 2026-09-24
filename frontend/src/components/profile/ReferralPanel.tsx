import { useState } from 'react';
import type { ReferralInfoDto } from '../../api/types';
import flagIcon from '../../assets/pixel/bandeira.png';

/**
 * "Indique um amigo" (Fase 17; pixel art na Fase 70) - codigo + copiar link + indicacoes confirmadas.
 * Saiu da aba Conquistas pra coluna direita do perfil: fica visivel em todas as abas.
 */
export function ReferralPanel({ info }: { info: ReferralInfoDto }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/login?ref=${info.referralCode}`;
  const count = info.confirmedReferralCount;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponivel (ex: contexto nao seguro) - sem tratamento especial, so nao copia.
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-3 border-2 border-secondary bg-base p-[18px]">
      <p className="font-pixel-label text-[9px] text-accent">// Indique um amigo</p>
      <p className="border-2 border-stroke bg-surface py-1.5 text-center font-pixel text-[32px] leading-tight tracking-[4px] text-accent">
        {info.referralCode}
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="border-2 border-accent bg-accent px-4 py-3.5 font-pixel-label text-[11px] leading-none text-base hover:brightness-110"
      >
        {copied ? 'Link copiado ✓' : 'Copiar link ›'}
      </button>
      <p className="flex items-center gap-2 font-pixel-label text-[8px] text-secondary">
        <img src={flagIcon} alt="" className="size-4 pixelated" />
        {count} {count === 1 ? 'indicação confirmada' : 'indicações confirmadas'}
      </p>
      <p className="text-xs text-muted">Cada indicação confirmada conta pro badge Embaixador.</p>
    </div>
  );
}
