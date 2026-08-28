import { LoginForm } from './LoginForm';

/**
 * "Erro - Sessao Expirada" (Fase 10, node Figma 13-978, nunca construida - ver
 * docs/fase-10/resumo-implementacao-fase-10.md e "O que uma proxima fase provavelmente precisa
 * saber" em docs/ARQUITETURA.md). Fase 22: modal global, montado por AuthProvider como irmao das
 * rotas (nunca dentro delas) - fica por cima de QUALQUER tela sem trocar a URL nem desmontar o
 * que estava la (ProtectedRoute continua vendo `user` truthy, so a Api que rejeitou a chamada).
 *
 * Chrome de modal (fixed inset-0 + card), nao `ErrorLayout` (Fase 10) - `ErrorLayout` pressupoe
 * `min-h-screen`, incompativel com sobrepor uma rota que continua viva por baixo (mesmo motivo
 * documentado em PublicationModal.tsx, Fase 11).
 *
 * Sem fechar no clique do fundo/ESC de proposito: a causa (cookie invalido/expirado) nao
 * desaparece so por fechar o modal - qualquer chamada nova a Api so reabriria de novo. `LoginForm`
 * e reaproveitado tal qual (Fase 12) - reautenticar so atualiza `user` no AuthContext, nunca
 * navega; a tela por baixo (e qualquer resposta ja digitada/gravada nela) nunca foi desmontada.
 */
export function SessionExpiredModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-6" role="presentation">
      <div
        className="flex w-[420px] flex-col gap-6 rounded-2xl border border-surface-alt bg-surface p-8"
        role="dialog"
        aria-modal="true"
        aria-label="Sessão expirada"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="flex size-14 items-center justify-center rounded-full border-2 border-alert bg-alert/10 text-2xl"
            aria-hidden="true"
          >
            🔒
          </span>
          <h1 className="text-xl font-bold text-primary">Sessão Expirada</h1>
          <p className="text-sm text-secondary">
            Sua sessão expirou. Faça login novamente para continuar - o que você já preencheu nesta tela não foi perdido.
          </p>
        </div>

        <LoginForm onSuccess={onClose} submitLabel="Retomar Sessão" />
      </div>
    </div>
  );
}
