import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { resolveLandingPath } from '../lib/onboarding';
import { PixelLogo } from '../components/entry/Entry';

// Sugerido no prompt: mesmo com a checagem de sessao instantanea, uma duracao minima evita o
// "flash" desconfortavel de uma tela que aparece e some quase no mesmo frame.
const MIN_SPLASH_DURATION_MS = 700;

/**
 * Tela de boot (Fase 12, design Figma "Splash / Loading") - unico lugar do app que decide entre
 * /login, /onboarding, /selecionar-curso e /start a partir da sessao (AuthProvider.getCurrentUser,
 * ja disparado no mount do provider - esta tela so espera o mesmo resultado, nunca busca de novo
 * sozinha). A ordem onboarding -> selecao de curso -> /start mora em lib/onboarding.ts
 * (resolveLandingPath), reaproveitada aqui e no onSuccess de login/registro (LoginPage) - nunca
 * duplicada.
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

    let cancelled = false;
    const elapsed = Date.now() - mountedAt;
    const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);

    const timer = setTimeout(() => {
      (user ? resolveLandingPath(user) : Promise.resolve('/login')).then((destination) => {
        if (!cancelled) navigate(destination, { replace: true });
      });
    }, remaining);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isLoading, user, navigate, mountedAt]);

  // Pixel art (Fase 74, Figma 144:4503): logo grande e a barra em 16 blocos enchendo de uma vez.
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-base p-6">
      <PixelLogo scale={10} className="max-w-full" />
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className={`h-3 w-3.5 transition-colors ${barStarted ? 'bg-accent' : 'bg-stroke'}`}
              style={{ transitionDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
        <p className="font-pixel text-[22px] text-secondary" role="status">
          Carregando o mapa, agente...
        </p>
      </div>
    </div>
  );
}
