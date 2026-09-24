import { LoginForm } from './LoginForm';
import { PixelModal } from '../PixelModal';
import { FocadaSays } from '../session/FocadaSays';

/**
 * "Erro - Sessao Expirada" (Fase 10, node Figma 13-978, nunca construida - ver
 * docs/fase-10/resumo-implementacao-fase-10.md e "O que uma proxima fase provavelmente precisa
 * saber" em docs/ARQUITETURA.md). Fase 22: modal global, montado por AuthProvider como irmao das
 * rotas (nunca dentro delas) - fica por cima de QUALQUER tela sem trocar a URL nem desmontar o
 * que estava la (ProtectedRoute continua vendo `user` truthy, so a Api que rejeitou a chamada).
 *
 * Chrome de modal (`PixelModal` desde 24/09/2026, com a Focada explicando), nao `ErrorLayout` (Fase
 * 10) - `ErrorLayout` ocupa a altura da tela, incompativel com sobrepor uma rota que continua viva por
 * baixo (mesmo motivo documentado em PublicationModal.tsx, Fase 11).
 *
 * Sem fechar no clique do fundo/ESC de proposito: a causa (cookie invalido/expirado) nao
 * desaparece so por fechar o modal - qualquer chamada nova a Api so reabriria de novo. `LoginForm`
 * e reaproveitado tal qual (Fase 12) - reautenticar so atualiza `user` no AuthContext, nunca
 * navega; a tela por baixo (e qualquer resposta ja digitada/gravada nela) nunca foi desmontada.
 */
export function SessionExpiredModal({ onClose }: { onClose: () => void }) {
  return (
    <PixelModal label="Sessão expirada" title="Sessão expirada" widthClass="max-w-lg">
      <FocadaSays expression="acolhedora">
        Sua sessão expirou, agente. Entra de novo pra continuar: o que você já preencheu nesta tela não foi perdido.
      </FocadaSays>
      <LoginForm onSuccess={onClose} submitLabel="Retomar sessão" pixel />
    </PixelModal>
  );
}
