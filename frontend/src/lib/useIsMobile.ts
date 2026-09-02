import { useEffect, useState } from 'react';

/** Breakpoint `md` do Tailwind (768px) - mesmo limiar ja usado em CSS pelo resto do app (`md:flex-row` etc, ver ARQUITETURA.md). */
const MOBILE_BREAKPOINT_PX = 768;

/**
 * true quando a viewport e estreita o bastante pra ser um celular (Fase 25) - usado por StartPage
 * pra decidir `WorldMapPage` (mapa, exige teclado pro personagem andar - sem sentido num
 * touchscreen) vs `StartDashboard` (hub de cards antigo, guardado desde a Fase 25 justamente pra
 * isso, ver docs/fase-25) em `/start` sem params.
 *
 * So largura de viewport, sem checar touch/user-agent - mais simples e cobre o caso real (celular
 * = tela estreita); uma janela de desktop redimensionada pra estreito tambem cai no fallback, mas
 * isso e aceitavel (nao ha teclado confiavel pra afirmar o contrario so pela largura).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT_PX);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
