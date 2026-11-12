import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { AI_DOT, AI_LINE } from '../lib/aiStatusText';
import {
  RECORDING_LIMIT_OPTIONS,
  getRecordingLimitMinutes,
  getUiSoundEnabled,
  getUiSoundVolume,
  setRecordingLimitMinutes,
  setUiSoundEnabled,
  setUiSoundVolume,
} from '../lib/settings';
import { playAdvance } from '../lib/uiSound';
import { useAiStatus } from '../lib/useAiStatus';
import { LegalFooter } from './legal/LegalBits';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { Choice } from './ui/Choice';
import { Modal } from './ui/Modal';

/** Volume dos sons em 3 degraus (Figma: Baixo, Médio, Alto). O salvo continua de 0 a 1. */
const VOLUME_LEVELS = [
  { label: 'Baixo', value: 0.25 },
  { label: 'Médio', value: 0.5 },
  { label: 'Alto', value: 1 },
] as const;

function nearestLevel(volume: number): number {
  return VOLUME_LEVELS.reduce((best, level) => (Math.abs(level.value - volume) < Math.abs(best - volume) ? level.value : best), VOLUME_LEVELS[0].value as number);
}

/**
 * Configurações (Fase 7; redesign v1 na Fase 109, Figma `33:1454`): modal aberto pelo menu do agente
 * (ou pelo ESC durante o Dia, ver TodayPage). Sons, limite de gravação da conversa por voz, privacidade
 * no squad, interesses e atalhos e a linha do status da IA (o robozinho da nav saiu). O que não existe
 * não aparece: saíram Aparência e Notificações "Em breve". "Sair da conta" foi pro menu do agente.
 */
export function SettingsMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SettingsModal onClose={onClose} />;
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ai = useAiStatus();
  const [recordingLimit, setRecordingLimit] = useState(() => getRecordingLimitMinutes());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [soundOn, setSoundOn] = useState(() => getUiSoundEnabled());
  const [volume, setVolume] = useState(() => nearestLevel(getUiSoundVolume()));

  // Fase 64: sons da interface - toca um som de amostra ao ligar e ao trocar o volume.
  function toggleSound() {
    const next = !soundOn;
    setUiSoundEnabled(next);
    setSoundOn(next);
    if (next) playAdvance();
  }

  function chooseVolume(value: number) {
    setUiSoundVolume(value);
    setVolume(value);
    playAdvance();
  }

  function chooseRecordingLimit(minutes: number) {
    setRecordingLimitMinutes(minutes);
    setRecordingLimit(minutes);
  }

  return (
    <Modal label="Configurações" eyebrow="Menu do agente" title="Configurações" onClose={onClose} width={640}>
      <Section title="Sons da interface">
        <Checkbox checked={soundOn} onChange={toggleSound}>
          Sons ligados
        </Checkbox>
        <div className="flex flex-wrap gap-4" role="group" aria-label="Volume dos sons">
          {VOLUME_LEVELS.map((level) => (
            <Choice key={level.label} selected={soundOn && volume === level.value} disabled={!soundOn} onClick={() => chooseVolume(level.value)}>
              {level.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Limite de gravação da conversa por voz">
        <div className="flex flex-wrap gap-4" role="group" aria-label="Limite de gravação">
          {RECORDING_LIMIT_OPTIONS.map((minutes) => (
            <Choice key={minutes} selected={recordingLimit === minutes} onClick={() => chooseRecordingLimit(minutes)}>
              {minutes} min
            </Choice>
          ))}
        </div>
      </Section>

      <SquadFeedPrivacy />

      <Section title="Interesses e atalhos">
        <div className="flex flex-wrap gap-6">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/onboarding/perfil?edit=1');
            }}
            className="text-rotulo-sm text-accent hover:text-accent-hover"
          >
            Editar interesses
          </button>
          <button type="button" aria-expanded={showShortcuts} onClick={() => setShowShortcuts((v) => !v)} className="text-rotulo-sm text-accent hover:text-accent-hover">
            {showShortcuts ? 'Ocultar atalhos de teclado' : 'Ver atalhos de teclado'}
          </button>
        </div>
        {showShortcuts && (
          <ul className="flex flex-col gap-2 text-pequeno text-secondary">
            <Shortcut keys="Esc">Abre e fecha as Configurações durante o Dia</Shortcut>
            <Shortcut keys="?">Abre a ajuda da tela</Shortcut>
            <Shortcut keys="1 a N · Enter">Escolhe e confirma a resposta</Shortcut>
          </ul>
        )}
      </Section>

      <Section title="Status da IA">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="flex items-center gap-2 text-pequeno text-primary" aria-live="polite">
            <span className={`size-2 shrink-0 ${ai.checking ? 'bg-muted' : AI_DOT[ai.health]}`} aria-hidden="true" />
            {ai.checking ? 'Consultando a IA...' : AI_LINE[ai.health]}
          </p>
          <button type="button" onClick={ai.refresh} disabled={ai.checking} className="text-rotulo-sm text-accent hover:text-accent-hover disabled:text-muted">
            Conferir agora
          </button>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button kind="secundario" onClick={onClose}>
          Fechar
        </Button>
        <LegalFooter variant="discreet" acceptedAt={user?.termsAcceptedAt} />
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-rotulo-sm text-secondary">{title}</h3>
      {children}
    </section>
  );
}

function Shortcut({ keys, children }: { keys: string; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span>{children}</span>
      <kbd className="shrink-0 border-2 border-stroke-strong px-2 py-0.5 text-rotulo-sm text-primary">{keys}</kbd>
    </li>
  );
}

/**
 * "Esconder minhas notas no feed do squad" (Fase 72, decisao do dono) - diferente das outras
 * preferencias daqui (localStorage), vale pros colegas, entao mora no backend (User.HideScoresInSquadFeed).
 */
function SquadFeedPrivacy() {
  const { user, setCurrentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const hidden = user.hideScoresInSquadFeed;

  async function toggle() {
    setBusy(true);
    try {
      setCurrentUser(await api.updateSquadFeedPrivacy(!hidden));
    } catch {
      // Falhou - a caixa so continua como estava.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Squad">
      <Checkbox checked={hidden} disabled={busy} onChange={toggle}>
        Esconder minhas notas no feed do squad
      </Checkbox>
      <p className="text-pequeno text-muted">O squad continua vendo que você estudou, só sem a nota.</p>
    </Section>
  );
}
