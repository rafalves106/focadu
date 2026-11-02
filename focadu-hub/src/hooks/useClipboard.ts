import { useCallback, useEffect, useRef, useState } from "react";

export function useClipboard(resetMs = 1500) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copiar = useCallback(
    async (texto: string) => {
      try {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiado(false), resetMs);
      } catch {
        setCopiado(false);
      }
    },
    [resetMs],
  );

  return { copiado, copiar };
}
