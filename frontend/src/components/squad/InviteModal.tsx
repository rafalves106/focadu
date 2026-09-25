import { useState } from 'react';
import { api } from '../../api/client';
import { useApiResource } from '../../api/useApiResource';
import type { ReferralInfoDto } from '../../api/types';
import { PixelModal } from '../PixelModal';
import flagIcon from '../../assets/pixel/bandeira.png';

/** Copia pro clipboard e marca "copiado" por 2s - clipboard indisponivel so nao copia. */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Contexto nao seguro/permissao negada - sem tratamento especial.
    }
  }
  return { copied, copy };
}

function referralLink(info: ReferralInfoDto): string {
  return `${window.location.origin}/login?ref=${info.referralCode}`;
}

/**
 * "Convidar" do QG (Fase 72, Figma node 125:12529) - os dois jeitos de trazer alguem: o codigo do
 * squad (pra quem ja estuda na Focadu) e o link de indicacao (pra quem ainda nao tem conta; conta pro
 * badge Embaixador quando a pessoa se matricula). O "Indique um amigo" saiu do Perfil e veio pra ca
 * (decisao do dono, 24/09/2026). A ideia do Figma de quem entra pelo link ja cair no squad NAO foi
 * implementada - ficou em aberto.
 */
export function InviteModal({ squadName, joinCode, onClose }: { squadName: string; joinCode: string; onClose: () => void }) {
  const { copied, copy } = useCopy();
  const { data: referral } = useApiResource(() => api.getReferralInfo(), []);

  return (
    <PixelModal label="Convidar pro squad" title="Convidar" onClose={onClose} widthClass="max-w-[600px]">
      <p className="font-pixel text-[32px] leading-none text-primary">Chame gente pro {squadName}</p>

      <div className="flex flex-col gap-2">
        <p className="font-pixel-label text-[8px] text-secondary">1 · Já estuda na Focadu? Entra com o código</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <span className="flex flex-1 items-center justify-center border-2 border-accent/60 bg-surface py-2 font-pixel text-4xl leading-none tracking-[6px] text-accent">{joinCode}</span>
          <button
            type="button"
            onClick={() => copy('code', joinCode)}
            className="border-2 border-accent px-5 py-3 font-pixel-label text-[10px] leading-none text-accent hover:bg-accent/10"
          >
            {copied === 'code' ? 'Copiado ✓' : 'Copiar código'}
          </button>
        </div>
      </div>

      <span className="h-0.5 bg-stroke" aria-hidden="true" />

      <div className="flex flex-col gap-2.5">
        <p className="flex items-center gap-2 font-pixel-label text-[8px] text-secondary">
          <img src={flagIcon} alt="" className="size-4 pixelated" />2 · Ainda não estuda? Indique um amigo
        </p>
        <p className="text-sm text-primary">Conta pro badge Embaixador quando a pessoa se matricula num curso. Depois é só mandar o código do squad.</p>
        {referral ? (
          <>
            <span className="truncate border-2 border-stroke bg-surface px-3 py-2 font-pixel text-2xl leading-none text-primary">{referralLink(referral)}</span>
            <button
              type="button"
              onClick={() => copy('link', referralLink(referral))}
              className="border-2 border-accent bg-accent px-5 py-3.5 font-pixel-label text-[11px] leading-none text-base hover:brightness-110"
            >
              {copied === 'link' ? 'Link copiado ✓' : 'Copiar link de indicação ›'}
            </button>
            <p className="flex items-end gap-2 bg-stroke/30 px-4 py-3">
              <span className="font-pixel text-5xl leading-[0.8] text-accent">{referral.confirmedReferralCount}</span>
              <span className="font-pixel-label text-[8px] text-accent">{referral.confirmedReferralCount === 1 ? 'indicação confirmada' : 'indicações confirmadas'}</span>
            </p>
          </>
        ) : (
          <p className="font-pixel-label text-[8px] text-muted">Carregando seu link...</p>
        )}
      </div>
    </PixelModal>
  );
}

/** Faixa "Indique um amigo" do estado sem squad (Fase 72, Figma node 126:14410). */
export function ReferralStrip() {
  const { copied, copy } = useCopy();
  const { data: referral } = useApiResource(() => api.getReferralInfo(), []);
  return (
    <section className="flex flex-col gap-4 border-2 border-stroke bg-base p-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="flex items-center gap-2 font-pixel-label text-[10px] text-accent">
          <img src={flagIcon} alt="" className="size-4 pixelated" />
          // Indique um amigo
        </p>
        <p className="font-pixel text-[22px] leading-tight text-primary">
          Ainda não conhece ninguém aqui? Chama um amigo: quando ele se matricular num curso, conta pro badge Embaixador.
        </p>
        {referral && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <span className="min-w-0 flex-1 truncate border-2 border-stroke bg-surface px-3 py-2.5 font-pixel text-2xl leading-none text-primary">{referralLink(referral)}</span>
            <button
              type="button"
              onClick={() => copy('link', referralLink(referral))}
              className="shrink-0 border-2 border-accent bg-accent px-5 py-3 font-pixel-label text-[10px] leading-none text-base hover:brightness-110"
            >
              {copied === 'link' ? 'Copiado ✓' : 'Copiar link ›'}
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 lg:w-[360px] lg:border-l-2 lg:border-stroke lg:pl-8">
        <p className="font-pixel-label text-[8px] text-muted">Suas indicações</p>
        <p className="flex items-end gap-2">
          <span className="font-pixel text-6xl leading-[0.8] text-secondary">{referral?.confirmedReferralCount ?? '…'}</span>
          <span className="font-pixel-label text-[8px] text-secondary">confirmadas</span>
        </p>
        <p className="text-[13px] text-muted">Dica: depois de indicar, crie o squad e mande o código também.</p>
      </div>
    </section>
  );
}
