import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RECORDING_LIMIT_OPTIONS, getRecordingLimitMinutes, setRecordingLimitMinutes } from '../lib/settings';

/** Trilho verde/cinza estatico (Fase 7) - visual apenas, ver nota de escopo no topo do arquivo. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-11 items-center rounded-full p-0.5 ${on ? 'justify-end bg-accent' : 'justify-start bg-surface-alt'}`}>
      <span className="size-5 rounded-full bg-primary" />
    </span>
  );
}

/** Selo "em breve" (2026-08-28) - marca Aparencia/Som/Notificacoes como placeholder ate existir tema claro/engine de som/notificacao de verdade por tras. */
function ComingSoonBadge() {
  return <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Em breve</span>;
}

/**
 * Menu de configuracoes (design Figma "Menu de Configuracoes (overlay)", Fase 7) - modal "estilo
 * jogo indie" sobre a tela de estudo, fundo desfocado (backdrop-blur nativo, sem precisar borrar a
 * arvore por tras manualmente). Acionado por ESC/voltar do navegador durante uma sessao ativa (ver
 * TodayPage) ou pelo botao de engrenagem.
 *
 * "Fechar (ESC)" (onClose), "Sair e salvar progresso" (onExit, so navega pra /start - o progresso
 * ja esta salvo no servidor a cada resposta enviada, nao ha nada extra pra "salvar") e
 * "Sair da Conta" (onLogout, Fase 13 - agora existe conta de verdade, ver docs/fase-12) sao acoes
 * reais desde a Fase 7. onLogout pede confirmacao simples (window.confirm) antes de executar -
 * evita logout acidental no meio de uma sessao.
 *
 * Fase 20: "Sair da Conta" virou o botao vermelho de largura total do Figma (era link de texto
 * simples, divergencia documentada desde a Fase 13a) - "Fechar (ESC)"/"Sair e salvar progresso"
 * continuam texto discreto acima dele (o Figma so mostra "Fechar (ESC)" + o botao de logout, sem
 * a 3a acao - mas "Sair e salvar progresso" e um caminho de saida real, tirar reduziria
 * funcionalidade so pra bater com o mockup, entao ficou como uma 2a linha discreta em vez de
 * removida).
 *
 * 2026-08-28: "Limite de gravação" virou select real (persistido em localStorage, ver
 * frontend/src/lib/settings.ts, lido por VoiceSummaryActivity), "Perfil e Analogias" -> Editar
 * navega pra /onboarding/perfil?edit=1 (mesmo link ja usado em InformationTab.tsx) e "Atalhos de
 * teclado" -> Ver expande a lista real (hoje so ESC, ver useSessionExitGuard em TodayPage.tsx).
 * Aparencia/Som/Notificacoes continuam placeholders visuais - nao ha tema claro, engine de som nem
 * sistema de notificacao implementados ainda pra esses toggles controlarem de verdade.
 */
export function SettingsMenu({
  open,
  onClose,
  onExit,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  onExit: () => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const [recordingLimit, setRecordingLimit] = useState(() => getRecordingLimitMinutes());
  const [showShortcuts, setShowShortcuts] = useState(false);

  if (!open) return null;

  function handleRecordingLimitChange(minutes: number) {
    setRecordingLimitMinutes(minutes);
    setRecordingLimit(minutes);
  }

  function handleLogoutClick() {
    if (window.confirm('Sair da conta? Você precisará entrar de novo para continuar estudando.')) {
      onLogout();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base/50 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-[420px] flex-col gap-4 rounded-[20px] border border-stroke bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[1.5px] text-muted">Configurações</p>
          <p className="text-sm text-secondary">Ajuste a experiência do focadu</p>
        </div>

        <div className="h-px bg-stroke" />

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 opacity-50 grayscale pointer-events-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-primary">Aparência</p>
                <ComingSoonBadge />
              </div>
              <div className="flex overflow-hidden rounded-xl border border-stroke bg-surface-alt text-xs font-semibold">
                <span className="flex h-9 w-[110px] items-center justify-center text-secondary">Tema Claro</span>
                <span className="flex h-9 w-[110px] items-center justify-center border-l border-stroke bg-accent/25 font-bold text-primary">
                  Tema Escuro
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-primary">Som</p>
                <ComingSoonBadge />
              </div>
              <Toggle on />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-primary">Notificações</p>
                <ComingSoonBadge />
              </div>
              <Toggle on={false} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Limite de gravação</p>
            <select
              value={recordingLimit}
              onChange={(e) => handleRecordingLimitChange(Number(e.target.value))}
              className="rounded-lg border border-stroke bg-surface-alt px-2 py-1 text-[13px] font-semibold text-primary"
            >
              {RECORDING_LIMIT_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-stroke" />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Perfil e Analogias</p>
            <button
              type="button"
              onClick={() => navigate('/onboarding/perfil?edit=1')}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Editar
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Atalhos de teclado</p>
            <button
              type="button"
              onClick={() => setShowShortcuts((prev) => !prev)}
              className="text-xs font-semibold text-accent hover:underline"
            >
              {showShortcuts ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          {showShortcuts && (
            <div className="flex items-center justify-between rounded-lg bg-surface-alt px-3 py-2 text-xs text-secondary">
              <span>Fechar/abrir este menu durante uma sessão</span>
              <kbd className="rounded border border-stroke bg-surface px-1.5 py-0.5 font-semibold text-primary">Esc</kbd>
            </div>
          )}
        </div>

        <div className="h-px bg-stroke" />

        <div className="flex flex-col items-center gap-2 pt-1">
          <button type="button" onClick={onClose} className="text-xs text-secondary hover:text-primary">
            Fechar (ESC)
          </button>
          <button type="button" onClick={onExit} className="text-xs font-semibold text-secondary hover:text-primary hover:underline">
            Sair e salvar progresso
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="w-full rounded-[10px] border border-alert/25 bg-alert/10 py-2.5 text-[13px] font-semibold text-alert hover:bg-alert/15"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
