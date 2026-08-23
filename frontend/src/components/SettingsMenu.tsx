const RECORDING_LIMIT_LABEL = '10:00'; // mesmo limite de VoiceSummaryActivity.MAX_RECORDING_SECONDS (10*60s).

/** Trilho verde/cinza estatico (Fase 7) - visual apenas, ver nota de escopo no topo do arquivo. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`flex h-6 w-11 items-center rounded-full p-0.5 ${on ? 'justify-end bg-accent' : 'justify-start bg-surface-alt'}`}>
      <span className="size-5 rounded-full bg-primary" />
    </span>
  );
}

/**
 * Menu de configuracoes (design Figma "Menu de Configuracoes (overlay)", Fase 7) - modal "estilo
 * jogo indie" sobre a tela de estudo, fundo desfocado (backdrop-blur nativo, sem precisar borrar a
 * arvore por tras manualmente). Acionado por ESC/voltar do navegador durante uma sessao ativa (ver
 * TodayPage) ou pelo botao de engrenagem.
 *
 * Aparencia/Som/Notificacoes/Limite de gravacao/Perfil e Analogias/Atalhos ficam como
 * placeholders visuais nao-funcionais (pedido explicito do prompt da Fase 7 - "Perfil e
 * Analogias" continua sem edicao nesta fase, a Entrevista de Perfil do onboarding e so pra
 * preencher uma vez, nao pra editar depois) - "Fechar (ESC)" (onClose),
 * "Sair e salvar progresso" (onExit, so navega pra /start - o progresso ja esta salvo no servidor
 * a cada resposta enviada, nao ha nada extra pra "salvar") e "Sair da Conta" (onLogout, Fase 13 -
 * agora existe conta de verdade, ver docs/fase-12) sao as acoes reais. onLogout pede confirmacao
 * simples (window.confirm) antes de executar - evita logout acidental no meio de uma sessao.
 *
 * Fase 20: "Sair da Conta" virou o botao vermelho de largura total do Figma (era link de texto
 * simples, divergencia documentada desde a Fase 13a) - "Fechar (ESC)"/"Sair e salvar progresso"
 * continuam texto discreto acima dele (o Figma so mostra "Fechar (ESC)" + o botao de logout, sem
 * a 3a acao - mas "Sair e salvar progresso" e um caminho de saida real, tirar reduziria
 * funcionalidade so pra bater com o mockup, entao ficou como uma 2a linha discreta em vez de
 * removida).
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
  if (!open) return null;

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
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Aparência</p>
            <div className="flex overflow-hidden rounded-xl border border-stroke bg-surface-alt text-xs font-semibold">
              <span className="flex h-9 w-[110px] items-center justify-center text-secondary">Tema Claro</span>
              <span className="flex h-9 w-[110px] items-center justify-center border-l border-stroke bg-accent/25 font-bold text-primary">
                Tema Escuro
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Som</p>
            <Toggle on />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Notificações</p>
            <Toggle on={false} />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Limite de gravação</p>
            <p className="text-[13px] font-semibold text-primary">{RECORDING_LIMIT_LABEL}</p>
          </div>
        </div>

        <div className="h-px bg-stroke" />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Perfil e Analogias</p>
            <span className="text-xs font-semibold text-accent">Editar</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary">Atalhos de teclado</p>
            <span className="text-xs font-semibold text-accent">Ver</span>
          </div>
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
