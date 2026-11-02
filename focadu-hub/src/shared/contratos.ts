/**
 * Contratos compartilhados entre o BFF (vite.config.ts) e o frontend.
 * Fonte única de verdade para tipos e constantes.
 */

export const MODELO_OLLAMA = "qwen2.5-coder:3b";
export const CHARS_POR_TOKEN = 3.5;
export const LIMITE_CTX = 16384;
export const RESERVA_RESPOSTA = 2048;

export function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / CHARS_POR_TOKEN);
}

/* ---------- Contextos ---------- */

export type CategoriaContexto = "perfil" | "arquitetura";

export interface ArquivoContexto {
  /** Formato: "<categoria>/<nome>.md", ex.: "perfil/arquiteto.md" */
  id: string;
  nome: string;
  categoria: CategoriaContexto;
  tamanhoBytes: number;
  tokensEstimados: number;
}

export interface ContextosResponse {
  perfis: ArquivoContexto[];
  arquitetura: ArquivoContexto[];
  avisos: string[];
}

/* ---------- Ask ---------- */

export interface AskRequest {
  arquivos: string[]; // ids
  instrucao: string;
}

export interface AskMeta {
  modelo: string;
  arquivosUsados: string[];
  numCtx: number;
  tokensEstimadosEntrada: number;
  tokensPrompt: number | null;
  tokensResposta: number | null;
  duracaoMs: number | null;
  truncada: boolean;
}

export interface AskResponse {
  resposta: string;
  meta: AskMeta;
}

/* ---------- Erros ---------- */

export type ApiErrorCode =
  | "OLLAMA_OFFLINE"
  | "MODELO_NAO_ENCONTRADO"
  | "OLLAMA_ERRO"
  | "TIMEOUT"
  | "CANCELADO"
  | "CONTEXTO_EXCEDIDO"
  | "PAYLOAD_INVALIDO"
  | "ARQUIVO_INVALIDO"
  | "METODO_NAO_PERMITIDO"
  | "ERRO_INTERNO";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

/* ---------- Ollama (API nativa /api/chat) ---------- */

export type OllamaRole = "system" | "user" | "assistant";

export interface OllamaMessage {
  role: OllamaRole;
  content: string;
}

export interface OllamaOptions {
  num_ctx?: number;
  num_predict?: number;
  temperature?: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: false;
  options?: OllamaOptions;
  keep_alive?: string | number;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  done_reason?: "stop" | "length" | "load" | string;
  total_duration?: number; // nanossegundos
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaErrorResponse {
  error: string;
}
