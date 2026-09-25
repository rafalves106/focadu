import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client';
import type { AgentLook } from '../../lib/agentSprites';
import { AgentSprite } from '../agent/AgentSprite';
import { ReferralStrip } from './InviteModal';
import { PanelLabel, PixelStage } from './pixelStage';
import trophyIcon from '../../assets/pixel/trofeu.png';
import checkIcon from '../../assets/pixel/check.png';
import fireIcon from '../../assets/pixel/chama-streak.png';
import crownIcon from '../../assets/pixel/coroa.png';

const PERKS: [string, string][] = [
  [trophyIcon, 'Ranking só entre vocês'],
  [checkIcon, 'Meta da semana em grupo'],
  [fireIcon, 'Feed com o que cada um fez'],
  [crownIcon, 'GG pra comemorar'],
];

/**
 * QG sem squad (Fase 72, Figma node 126:14410): o agente sozinho no palco com as vagas em volta,
 * criar ou entrar com codigo, e o "Indique um amigo" (que saiu do Perfil). `onDone` recarrega o QG.
 */
export function NoSquadView({ look, onDone }: { look: AgentLook | null; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4 lg:gap-4">
      <section className="flex flex-col border-2 border-accent/60 bg-base shadow-[6px_6px_0_0_#1c9e3e] lg:flex-row">
        <div className="flex shrink-0 flex-col gap-3 p-5 lg:w-[340px] lg:border-r-2 lg:border-stroke">
          <PanelLabel>QG do squad</PanelLabel>
          <h1 className="font-pixel-label text-3xl leading-none text-primary uppercase">Sem squad</h1>
          <p className="font-pixel text-[22px] leading-none text-secondary">Quem estuda junto segura a ofensiva.</p>
          <p className="text-[13px] text-secondary">Monte o seu ou entre no de alguém. Dá pra ter um squad por vez.</p>
        </div>
        <PixelStage className="min-w-0 flex-1 border-y-2 border-stroke lg:border-y-0 lg:border-r-2" floor="bottom-[34px]" steps={9}>
          <ul className="flex items-end justify-center gap-2 px-4 pt-10 pb-3 sm:gap-4" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) =>
              i === 2 ? (
                <li key={i} className="flex w-16 flex-col items-center gap-2">
                  {look ? <AgentSprite look={look} frame={{ mini: 'baixo', step: 0 }} scale={4} /> : <span className="size-16" />}
                  <span className="font-pixel-label text-[9px] text-accent">Você</span>
                </li>
              ) : (
                <li key={i} className={`flex w-16 flex-col items-center gap-2 ${i > 3 ? 'hidden sm:flex' : ''}`}>
                  <span className="flex h-[60px] w-14 items-center justify-center border-2 border-dashed border-muted font-pixel text-3xl text-muted">?</span>
                  <span className="font-pixel-label text-[8px] text-muted">Vaga</span>
                </li>
              ),
            )}
          </ul>
        </PixelStage>
        <div className="flex shrink-0 flex-col gap-3 p-5 lg:w-[300px]">
          <PanelLabel>Num squad você tem</PanelLabel>
          <ul className="flex flex-col gap-3">
            {PERKS.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-2.5 font-pixel text-[21px] leading-none text-primary">
                <img src={icon} alt="" className="size-4 pixelated" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <SquadForm
          title="Criar um squad"
          hint="Você vira líder e ganha o código de convite."
          label="Nome do squad"
          placeholder="Ex.: Byte Force"
          submitLabel="Criar squad ›"
          busyLabel="Criando..."
          failMessage="Não foi possível criar o squad."
          primary
          onSubmit={(value) => api.createSquad(value)}
          onDone={onDone}
        />
        <SquadForm
          title="Entrar com código"
          hint="Pede o código pra quem já está no squad."
          label="Código de convite"
          placeholder="8 letras e números"
          submitLabel="Entrar ›"
          busyLabel="Entrando..."
          failMessage="Não foi possível entrar neste squad."
          code
          onSubmit={(value) => api.joinSquad(value)}
          onDone={onDone}
        />
      </div>

      <ReferralStrip />
    </div>
  );
}

function SquadForm({
  title,
  hint,
  label,
  placeholder,
  submitLabel,
  busyLabel,
  failMessage,
  primary = false,
  code = false,
  onSubmit,
  onDone,
}: {
  title: string;
  hint: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  busyLabel: string;
  failMessage: string;
  primary?: boolean;
  code?: boolean;
  onSubmit: (value: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(value.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 border-2 bg-base p-5 ${primary ? 'border-accent/60' : 'border-stroke'}`}>
      <PanelLabel>{title}</PanelLabel>
      <p className="font-pixel text-xl leading-none text-secondary">{hint}</p>
      <label className="mt-2 flex flex-col gap-1.5">
        <span className="font-pixel-label text-[8px] text-muted">{label}</span>
        <input
          value={value}
          onChange={(e) => setValue(code ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          className={`w-full border-2 border-stroke bg-surface px-3 py-2.5 font-pixel text-[22px] leading-tight text-primary outline-none placeholder:text-muted focus:border-accent ${code ? 'tracking-[3px] uppercase' : ''}`}
        />
      </label>
      {error && <p className="font-pixel text-lg text-alert">{error}</p>}
      <button
        type="submit"
        disabled={busy || !value.trim()}
        className={`border-2 px-4 py-3.5 font-pixel-label text-[11px] leading-none disabled:opacity-40 ${
          primary ? 'border-accent bg-accent text-base hover:brightness-110' : 'border-accent text-accent hover:bg-accent/10'
        }`}
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}
