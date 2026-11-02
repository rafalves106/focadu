import type {
  ApiErrorBody,
  ApiErrorCode,
  AskRequest,
  AskResponse,
  ContextosResponse,
} from "../shared/contratos";

export type CodigoErroCliente = ApiErrorCode | "REDE";

export class ApiError extends Error {
  readonly code: CodigoErroCliente;
  readonly status: number;

  constructor(code: CodigoErroCliente, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

function isApiErrorBody(valor: unknown): valor is ApiErrorBody {
  if (typeof valor !== "object" || valor === null || !("error" in valor))
    return false;
  const erro = (valor as { error: unknown }).error;
  return (
    typeof erro === "object" &&
    erro !== null &&
    typeof (erro as Record<string, unknown>).code === "string" &&
    typeof (erro as Record<string, unknown>).message === "string"
  );
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export function normalizarErro(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const msg = err instanceof Error ? err.message : "Erro desconhecido.";
  return new ApiError("ERRO_INTERNO", msg, 0);
}

async function requisitar<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError("REDE", "Sem conexão com o servidor do Vite.", 0);
  }

  const texto = await res.text();
  let dados: unknown = null;
  try {
    dados = texto ? (JSON.parse(texto) as unknown) : null;
  } catch {
    /* resposta não-JSON */
  }

  if (!res.ok) {
    if (isApiErrorBody(dados)) {
      throw new ApiError(dados.error.code, dados.error.message, res.status);
    }
    throw new ApiError(
      "ERRO_INTERNO",
      `HTTP ${res.status} inesperado.`,
      res.status,
    );
  }

  return dados as T;
}

export function buscarContextos(
  signal?: AbortSignal,
): Promise<ContextosResponse> {
  return requisitar<ContextosResponse>("/api/contextos", { signal });
}

export function enviarPergunta(
  payload: AskRequest,
  signal?: AbortSignal,
): Promise<AskResponse> {
  return requisitar<AskResponse>("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
}
