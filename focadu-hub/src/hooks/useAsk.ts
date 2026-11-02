import { useCallback, useEffect, useRef, useState } from "react";
import {
  enviarPergunta,
  isAbortError,
  normalizarErro,
  type ApiError,
} from "../lib/api";
import type { AskRequest, AskResponse } from "../shared/contratos";

export interface UseAsk {
  resposta: AskResponse | null;
  carregando: boolean;
  erro: ApiError | null;
  perguntar: (payload: AskRequest) => Promise<void>;
  cancelar: () => void;
}

export function useAsk(): UseAsk {
  const [resposta, setResposta] = useState<AskResponse | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<ApiError | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  const perguntar = useCallback(async (payload: AskRequest) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    setCarregando(true);
    setErro(null);

    try {
      setResposta(await enviarPergunta(payload, ctrl.signal));
    } catch (err) {
      if (!isAbortError(err)) setErro(normalizarErro(err));
    } finally {
      if (ctrlRef.current === ctrl) {
        ctrlRef.current = null;
        setCarregando(false);
      }
    }
  }, []);

  const cancelar = useCallback(() => {
    ctrlRef.current?.abort(); // o BFF detecta e aborta o Ollama também
    ctrlRef.current = null;
    setCarregando(false);
  }, []);

  return { resposta, carregando, erro, perguntar, cancelar };
}
