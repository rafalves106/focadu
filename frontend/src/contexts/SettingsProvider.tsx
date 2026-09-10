import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsMenu } from '../components/SettingsMenu';
import { useAuth } from './useAuth';
import { SettingsContext } from './settingsContextObject';

/**
 * Fase 25: o Menu de Configuracoes (Fase 7) deixou de morar so dentro de `/hoje` - o GlobalNav
 * novo precisa abri-lo de qualquer tela. Precisa de UM estado/instancia so pro app inteiro (senao
 * GlobalNav e TodayPage cada um abriria seu proprio modal, sem saber do outro) - mesmo padrao de
 * `AuthProvider`: o Provider guarda o estado e renderiza o modal 1x como irmao de `children`,
 * sobrevive a qualquer navegacao/rota. `useSessionExitGuard` (TodayPage) chama `toggle()` no
 * ESC/voltar do navegador durante uma sessao ativa - unica coisa que faz "ESC" fechar o menu de
 * verdade (SettingsMenu nao tem listener de teclado proprio).
 *
 * 2026-09-10: removido "Sair e salvar progresso" (onExit) do SettingsMenu - so navegava pra
 * /start sem salvar nada extra, acao redundante.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

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
      <SettingsMenu
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onLogout={() => {
          void logout().then(() => navigate('/login'));
        }}
      />
    </SettingsContext.Provider>
  );
}
