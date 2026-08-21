import { useState } from 'react';
import type { ReferralInfoDto } from '../../api/types';

/** Código de indicação + botão copiar link + contador de indicações confirmadas (Fase 17). */
export function ReferralCard({ info }: { info: ReferralInfoDto }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/login?ref=${info.referralCode}`;

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
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-alt bg-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Indique um amigo</p>
      <p className="font-mono text-2xl font-bold tracking-[0.3em] text-accent">{info.referralCode}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-xl bg-accent py-2.5 text-sm font-bold tracking-wide text-base"
      >
        {copied ? 'LINK COPIADO ✓' : 'COPIAR LINK DE INDICAÇÃO'}
      </button>
      <p className="text-sm text-secondary">
        {info.confirmedReferralCount} indicação(ões) confirmada(s)
      </p>
    </div>
  );
}
