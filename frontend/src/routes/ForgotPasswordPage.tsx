import { useState } from 'react';
import { BackToLogin } from '../components/auth/BackToLogin';
import { EntryCard, EntryScreen } from '../components/entry/Entry';
import { FocadaSays } from '../components/session/FocadaSays';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

/**
 * /esqueci-senha (Fase 41; pixel art na Fase 74, Figma "Entrada e onboarding — v2", node 145:5869) -
 * a mensagem de sucesso e a mesma pra email cadastrado ou nao (o backend nunca revela isso).
 */
export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  // Pixel art (Fase 74, Figma 145:5869): cartao "Esqueci minha senha" e, depois do envio, a Focada confirmando.
  return (
    <EntryScreen>
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-20">
        <EntryCard className="w-full max-w-[440px]">
          {submittedEmail ? (
            <>
              <p className="font-pixel-label text-[10px] text-accent">// Link enviado</p>
              <FocadaSays expression="comemorando" size="sm">
                Se {submittedEmail} estiver cadastrado, o link já está a caminho (vale 1 hora). Confere o spam também.
              </FocadaSays>
            </>
          ) : (
            <>
              <p className="font-pixel-label text-[10px] text-accent">// Esqueci minha senha</p>
              <h1 className="font-pixel text-[34px] leading-none text-primary">Sem problema, agente.</h1>
              <p className="font-pixel text-[22px] leading-tight text-secondary">
                Diga o e-mail da conta. Se ele existir, chega um link pra criar uma senha nova.
              </p>
              <ForgotPasswordForm onSubmitted={setSubmittedEmail} />
            </>
          )}
          <BackToLogin />
        </EntryCard>
      </div>
    </EntryScreen>
  );
}
