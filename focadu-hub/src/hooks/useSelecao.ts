import { useCallback, useMemo, useState } from "react";
import type { ArquivoContexto } from "../shared/contratos";

export interface UseSelecao {
  selecionados: ArquivoContexto[];
  tokensSelecionados: number;
  isSelecionado: (id: string) => boolean;
  alternar: (id: string) => void;
  definirVarios: (ids: string[], marcar: boolean) => void;
  limpar: () => void;
}

export function useSelecao(disponiveis: ArquivoContexto[]): UseSelecao {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  const mapa = useMemo(
    () => new Map(disponiveis.map((a) => [a.id, a])),
    [disponiveis],
  );

  // Descarta IDs que sumiram do disco após um "recarregar".
  const selecionados = useMemo(
    () =>
      [...ids]
        .map((id) => mapa.get(id))
        .filter((a): a is ArquivoContexto => a !== undefined),
    [ids, mapa],
  );

  const tokensSelecionados = useMemo(
    () => selecionados.reduce((acc, a) => acc + a.tokensEstimados, 0),
    [selecionados],
  );

  const isSelecionado = useCallback((id: string) => ids.has(id), [ids]);

  const alternar = useCallback((id: string) => {
    setIds((prev) => {
      const prox = new Set(prev);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  }, []);

  const definirVarios = useCallback((lista: string[], marcar: boolean) => {
    setIds((prev) => {
      const prox = new Set(prev);
      for (const id of lista) {
        if (marcar) prox.add(id);
        else prox.delete(id);
      }
      return prox;
    });
  }, []);

  const limpar = useCallback(() => setIds(new Set()), []);

  return {
    selecionados,
    tokensSelecionados,
    isSelecionado,
    alternar,
    definirVarios,
    limpar,
  };
}
