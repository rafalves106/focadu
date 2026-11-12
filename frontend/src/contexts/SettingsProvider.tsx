import { useState, type ReactNode } from 'react';
import { SettingsMenu } from '../components/SettingsMenu';
import { SettingsContext } from './settingsContextObject';

/**
 * Fase 25: as Configuracoes deixaram de morar so dentro de `/hoje` - a casca abre de qualquer tela
 * (desde a Fase 109, pelo menu do agente). UM estado/instancia so pro app inteiro: o Provider guarda o
 * estado e renderiza o modal 1x como irmao de `children`, sobrevive a qualquer navegacao.
 * `useSessionExitGuard` (TodayPage) chama `toggle()` no ESC/voltar do navegador durante o Dia.
 *
 * Fase 109: "Sair da conta" saiu das Configuracoes e foi pro menu do agente (`AgentMenu`).
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((prev) => !prev),
      }}
    >
      {children}
      <SettingsMenu open={isOpen} onClose={() => setIsOpen(false)} />
    </SettingsContext.Provider>
  );
}
