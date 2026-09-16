import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

/**
 * /esqueci-senha (Fase 41) - fora do node de Figma da LoginPage (nao existia quando ela foi
 * desenhada, ver comentario em LoginPage.tsx); layout simples em cartao centralizado, reaproveitando
 * so os tokens visuais (cores/fontes) do resto do app, sem tentar reproduzir o painel de marca
 * dividido da LoginPage.
 */
export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-8">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-[-1px] text-primary">FOCADU</h1>
          <p className="font-display text-[15px] text-secondary">Esqueceu sua senha? Sem problema.</p>
        </div>

        {submittedEmail ? (
          <p className="font-display rounded-xl border border-surface-alt bg-surface p-6 text-center text-sm text-secondary">
            Se <strong className="text-primary">{submittedEmail}</strong> estiver cadastrado, você vai receber um email com um link
            para redefinir sua senha em instantes.
          </p>
        ) : (
          <ForgotPasswordForm onSubmitted={setSubmittedEmail} />
        )}

        <p className="font-display text-center text-sm text-secondary">
          <Link to="/login" className="font-semibold text-accent hover:underline">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
