import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

/** /redefinir-senha?token=... (Fase 41) - o link vem do email de ForgotPasswordForm; mesmo layout simples de ForgotPasswordPage. */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [done, setDone] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-8">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-[-1px] text-primary">FOCADU</h1>
          <p className="font-display text-[15px] text-secondary">Escolha sua nova senha.</p>
        </div>

        {!token ? (
          <p className="font-display rounded-xl border border-alert/40 bg-alert/10 p-6 text-center text-sm text-alert">
            Link de redefinição inválido ou incompleto. Peça um novo link na tela de login.
          </p>
        ) : done ? (
          <p className="font-display rounded-xl border border-surface-alt bg-surface p-6 text-center text-sm text-secondary">
            Senha redefinida com sucesso!
          </p>
        ) : (
          <ResetPasswordForm token={token} onSuccess={() => setDone(true)} />
        )}

        <p className="font-display text-center text-sm text-secondary">
          <Link to="/login" className="font-semibold text-accent hover:underline">
            {done ? 'Ir para o login' : 'Voltar para o login'}
          </Link>
        </p>
      </div>
    </div>
  );
}
