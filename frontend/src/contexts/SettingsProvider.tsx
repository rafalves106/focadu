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
 * `onExit` continua `window.location.href` (recarga completa), nao `navigate()` - de proposito,
 * igual ja era antes desta fase: `useSessionExitGuard` empurra uma entrada de historico
 * "sentinela" pra interceptar o botao voltar durante a sessao; uma navegacao client-side deixaria
 * essa entrada extra emperrada no historico, uma recarga completa descarta tudo de uma vez.
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
        onExit={() => {
          window.location.href = '/start';
        }}
        onLogout={() => {
          void logout().then(() => navigate('/login'));
        }}
      />
    </SettingsContext.Provider>
  );
}
