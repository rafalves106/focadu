import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buscarContextos,
  isAbortError,
  normalizarErro,
  type ApiError,
} from "../lib/api";
import type { ArquivoContexto, ContextosResponse } from "../shared/contratos";

export interface UseContextos {
  perfis: ArquivoContexto[];
  arquitetura: ArquivoContexto[];
  todos: ArquivoContexto[];
  avisos: string[];
  carregando: boolean;
  erro: ApiError | null;
  recarregar: () => void;
}

const VAZIO: ArquivoContexto[] = [];

export function useContextos(): UseContextos {
  const [dados, setDados] = useState<ContextosResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<ApiError | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();

    async function carregar(): Promise<void> {
      setCarregando(true);
      setErro(null);
      try {
        setDados(await buscarContextos(ctrl.signal));
      } catch (err) {
        if (!isAbortError(err)) setErro(normalizarErro(err));
      } finally {
        if (!ctrl.signal.aborted) setCarregando(false);
      }
    }

    void carregar();
    return () => ctrl.abort();
  }, [versao]);

  const todos = useMemo(
    () => (dados ? [...dados.perfis, ...dados.arquitetura] : VAZIO),
    [dados],
  );

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return {
    perfis: dados?.perfis ?? VAZIO,
    arquitetura: dados?.arquitetura ?? VAZIO,
    todos,
    avisos: dados?.avisos ?? [],
    carregando,
    erro,
    recarregar,
  };
}
