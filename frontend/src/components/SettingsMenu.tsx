import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PixelConfirmDialog } from './PixelConfirmDialog';
import { PixelModal } from './PixelModal';
import { PixelButton, PixelChip } from './session/PixelButton';

/** Interruptor pixel (24/09/2026): trilho reto de 2px com o bloco do lado ligado - visual apenas, o
 * `role="switch"` fica no botao que o envolve. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-11 items-center border-2 p-0.5 ${on ? 'justify-end border-accent' : 'justify-start border-stroke'}`}>
      <span className={`size-4 ${on ? 'bg-accent' : 'bg-muted'}`} />
    </span>
  );
}

/** Rotulo de linha do menu, em VT323. */
function RowLabel({ children }: { children: ReactNode }) {
  return <p className="font-pixel text-xl leading-none text-primary">{children}</p>;
}

/** Link de acao da linha ("Editar", "Ver"), em Silkscreen. */
const rowAction = 'font-pixel-label text-[9px] text-accent hover:brightness-125';

/**
 * Menu de configuracoes (design Figma "Menu de Configuracoes (overlay)", Fase 7) - modal "estilo
 * jogo indie" sobre a tela de estudo, fundo desfocado (backdrop-blur nativo, sem precisar borrar a
 * arvore por tras manualmente). Acionado por ESC/voltar do navegador durante uma sessao ativa (ver
 * TodayPage) ou pelo botao de engrenagem.
 *
 * "Fechar (ESC)" (onClose) e "Sair da Conta" (onLogout, Fase 13 - agora existe conta de verdade,
 * ver docs/fase-12) sao acoes reais desde a Fase 7. onLogout pede confirmacao simples
 * (window.confirm) antes de executar - evita logout acidental no meio de uma sessao.
 *
 * Fase 20: "Sair da Conta" virou o botao vermelho de largura total do Figma (era link de texto
 * simples, divergencia documentada desde a Fase 13a) - "Fechar (ESC)" continua texto discreto
 * acima dele, batendo com o Figma.
 *
 * 2026-09-10: removido "Sair e salvar progresso" (onExit) - so navegava pra /start sem salvar nada
 * extra (o progresso ja e salvo no servidor a cada resposta enviada), acao redundante com
 * "Fechar (ESC)"/fechar o navegador.
 *
 * 2026-08-28: "Limite de gravação" virou select real (persistido em localStorage, ver
 * frontend/src/lib/settings.ts, lido por VoiceSummaryActivity), "Perfil e Analogias" -> Editar
 * navega pra /onboarding/perfil?edit=1 (mesmo link ja usado em InformationTab.tsx) e "Atalhos de
 * teclado" -> Ver expande a lista real (hoje so ESC, ver useSessionExitGuard em TodayPage.tsx).
 * Aparencia/Notificacoes continuam placeholders visuais - nao ha tema claro, engine de som nem
 * sistema de notificacao implementados ainda pra esses toggles controlarem de verdade.
 *
 * 24/09/2026 (pedido do dono, todos os modais em pixel art): casca `PixelModal` (ESC e clique fora
 * fecham), linhas em VT323, interruptor e "Em breve" em pixel, "Sair da conta" confirmado pela Focada
 * (`PixelConfirmDialog`, foco no "nao") no lugar do `window.confirm`. "Sons da interface" saiu do bloco
 * desabilitado de "Em breve", onde tinha ficado preso desde a Fase 64 (o interruptor nao recebia clique).
 */
export function SettingsMenu({
  open,
  onClose,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [recordingLimit, setRecordingLimit] = useState(() => getRecordingLimitMinutes());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [uiSoundEnabled, setUiSoundEnabledState] = useState(() => getUiSoundEnabled());
  const [uiSoundVolume, setUiSoundVolumeState] = useState(() => getUiSoundVolume());
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  // Fase 64: "Som" deixou de ser placeholder - liga/desliga e volume dos sons da interface (hoje, os
  // do dialogo da Focada no Projeto Semanal). Toca um som de amostra ao mudar, pra ouvir o volume.
  function handleUiSoundToggle() {
    const next = !uiSoundEnabled;
    setUiSoundEnabled(next);
    setUiSoundEnabledState(next);
    if (next) playAdvance();
  }

  function handleUiSoundVolumeChange(volume: number) {
    setUiSoundVolume(volume);
    setUiSoundVolumeState(volume);
  }

  if (!open) return null;

  function handleRecordingLimitChange(minutes: number) {
    setRecordingLimitMinutes(minutes);
    setRecordingLimit(minutes);
  }

  return (
    <>
      <PixelModal label="Configurações" title="Configurações" onClose={onClose} widthClass="max-w-md">
        <p className="-mt-2 font-pixel text-lg leading-none text-secondary">Ajuste a experiência do focadu</p>

        <div className="flex flex-col gap-4 border-t-2 border-stroke pt-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <RowLabel>Sons da interface</RowLabel>
              <button type="button" role="switch" aria-checked={uiSoundEnabled} aria-label="Sons da interface" onClick={handleUiSoundToggle}>
                <Toggle on={uiSoundEnabled} />
              </button>
            </div>
            {uiSoundEnabled && (
              <label className="flex items-center justify-between gap-4 font-pixel text-lg leading-none text-secondary">
                Volume
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={uiSoundVolume}
                  onChange={(e) => handleUiSoundVolumeChange(Number(e.target.value))}
                  onPointerUp={() => playAdvance()}
                  onKeyUp={() => playAdvance()}
                  className="w-40 accent-accent"
                />
              </label>
            )}
          </div>

          <div className="flex items-center justify-between">
            <RowLabel>Limite de gravação</RowLabel>
            <select
              value={recordingLimit}
              onChange={(e) => handleRecordingLimitChange(Number(e.target.value))}
              aria-label="Limite de gravação"
              className="shrink-0 border-2 border-stroke bg-surface px-2 py-1 font-pixel text-xl leading-none text-primary focus:border-accent focus:outline-none"
            >
              {RECORDING_LIMIT_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}:00
                </option>
              ))}
            </select>
          </div>

          <div className="pointer-events-none flex flex-col gap-4 opacity-50 grayscale">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RowLabel>Aparência</RowLabel>
                <PixelChip>Em breve</PixelChip>
              </div>
              <div className="flex border-2 border-stroke font-pixel-label text-[9px]">
                <span className="flex h-8 w-20 items-center justify-center text-secondary">Claro</span>
                <span className="flex h-8 w-20 items-center justify-center border-l-2 border-stroke bg-accent/25 text-primary">Escuro</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RowLabel>Notificações</RowLabel>
                <PixelChip>Em breve</PixelChip>
              </div>
              <Toggle on={false} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t-2 border-stroke pt-4">
          <div className="flex items-center justify-between">
            <RowLabel>Perfil e Analogias</RowLabel>
            <button type="button" onClick={() => navigate('/onboarding/perfil?edit=1')} className={rowAction}>
              Editar
            </button>
          </div>
          <div className="flex items-center justify-between">
            <RowLabel>Atalhos de teclado</RowLabel>
            <button type="button" onClick={() => setShowShortcuts((prev) => !prev)} className={rowAction}>
              {showShortcuts ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {showShortcuts && (
            <div className="flex items-center justify-between gap-3 border-2 border-stroke bg-surface px-3 py-2 font-pixel text-lg leading-none text-secondary">
              <span>Fechar/abrir este menu durante uma sessão</span>
              <kbd className="border-2 border-stroke bg-base px-1.5 py-1 font-pixel-label text-[9px] text-primary">Esc</kbd>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-stroke pt-4">
          <PixelButton ghost tone="muted" onClick={onClose} className="w-full">
            Fechar (Esc)
          </PixelButton>
          <PixelButton ghost tone="alert" onClick={() => setConfirmingLogout(true)} className="w-full">
            Sair da conta
          </PixelButton>
        </div>
      </PixelModal>

      <PixelConfirmDialog
        open={confirmingLogout}
        message="Sair da conta, agente? Pra continuar estudando você vai precisar entrar de novo."
        cancelLabel="Não, fico por aqui"
        confirmLabel="Sim, sair da conta"
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => {
          setConfirmingLogout(false);
          onLogout();
        }}
      />
    </>
  );
}
