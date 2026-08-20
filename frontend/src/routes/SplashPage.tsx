import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

// Sugerido no prompt: mesmo com a checagem de sessao instantanea, uma duracao minima evita o
// "flash" desconfortavel de uma tela que aparece e some quase no mesmo frame.
const MIN_SPLASH_DURATION_MS = 700;

/**
 * Tela de boot (Fase 12, design Figma "Splash / Loading") - unico lugar do app que decide entre
 * /start e /login a partir da sessao (AuthProvider.getCurrentUser, ja disparado no mount do
 * provider - esta tela so espera o mesmo resultado, nunca busca de novo sozinha).
 */
export function SplashPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  // useState (nao useRef) de proposito: o inicializador lazy so roda uma vez, na primeira
  // renderizacao, sem chamar Date.now() de novo a cada re-render (o unico jeito "puro" de captar
  // o instante de montagem direto no corpo do componente).
  const [mountedAt] = useState(() => Date.now());
  const [barStarted, setBarStarted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarStarted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const elapsed = Date.now() - mountedAt;
    const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);
    const timer = setTimeout(() => navigate(user ? '/start' : '/login', { replace: true }), remaining);
    return () => clearTimeout(timer);
  }, [isLoading, user, navigate, mountedAt]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-base p-6">
      <div className="rounded-xl border-2 border-accent px-8 py-4 shadow-[0_0_24px_-4px_var(--color-accent)]">
        <p className="text-2xl font-black tracking-[0.3em] text-primary">FOCADU</p>
      </div>

      <div className="flex w-56 flex-col items-center gap-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-alt">
          <div
            className={`h-full rounded-full bg-accent transition-all duration-700 ease-out ${barStarted ? 'w-full' : 'w-0'}`}
          />
        </div>
        <p className="text-xs text-secondary">Preparando seu cockpit...</p>
      </div>
    </div>
  );
}
