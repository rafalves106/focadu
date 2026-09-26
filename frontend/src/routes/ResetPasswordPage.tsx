import { useState } from 'react';
import { BackToLogin } from '../components/auth/BackToLogin';
import { EntryCard, EntryScreen } from '../components/entry/Entry';
import { FocadaSays } from '../components/session/FocadaSays';
import { useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

/**
 * /redefinir-senha?token= (Fase 41; pixel art na Fase 74, Figma 145:5869) - link do email; sem token,
 * so o aviso de link invalido.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [done, setDone] = useState(false);

  // Pixel art (Fase 74, Figma 145:5869): mesma casca do "esqueci"; link invalido vira aviso vermelho.
  return (
    <EntryScreen>
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:py-20">
        <EntryCard className="w-full max-w-[440px]">
          <p className="font-pixel-label text-[10px] text-accent">// Nova senha</p>
          {!token ? (
            <p className="border-2 border-alert px-3 py-2.5 font-pixel text-xl leading-tight text-alert">
              Link de redefinição inválido ou incompleto. Peça um novo em "Esqueci minha senha", na tela de login.
            </p>
          ) : done ? (
            <FocadaSays expression="comemorando" size="sm">
              Senha nova salva, agente. Agora é só entrar.
            </FocadaSays>
          ) : (
            <>
              <h1 className="font-pixel text-[34px] leading-none text-primary">Escolha sua nova senha.</h1>
              <ResetPasswordForm token={token} onSuccess={() => setDone(true)} />
            </>
          )}
          <BackToLogin label={done ? 'Ir para o login' : 'Voltar pro login'} />
        </EntryCard>
      </div>
    </EntryScreen>
  );
}
