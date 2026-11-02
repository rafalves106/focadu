import type { ApiError, CodigoErroCliente } from "../lib/api";
import { MODELO_OLLAMA } from "../shared/contratos";

const DICAS: Partial<Record<CodigoErroCliente, string>> = {
  OLLAMA_OFFLINE: "ollama serve",
  MODELO_NAO_ENCONTRADO: `ollama pull ${MODELO_OLLAMA}`,
  REDE: "npm run dev",
};

interface AlertaErroProps {
  erro: ApiError;
}

export function AlertaErro({ erro }: AlertaErroProps) {
  const dica = DICAS[erro.code];

  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm"
    >
      <p className="font-semibold text-rose-300">
        ✖ {erro.code}
        {erro.status > 0 && (
          <span className="ml-2 text-xs font-normal text-rose-400/70">
            HTTP {erro.status}
          </span>
        )}
      </p>
      <p className="mt-1 text-rose-200/90">{erro.message}</p>
      {dica && (
        <pre className="mt-2 rounded bg-slate-950/70 px-3 py-2 text-xs text-emerald-300">
          $ {dica}
        </pre>
      )}
    </div>
  );
}
