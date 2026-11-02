import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  MODELO_OLLAMA,
  LIMITE_CTX,
  RESERVA_RESPOSTA,
  estimarTokens,
  type ApiErrorBody,
  type ApiErrorCode,
  type ArquivoContexto,
  type AskRequest,
  type AskResponse,
  type CategoriaContexto,
  type ContextosResponse,
  type OllamaChatRequest,
  type OllamaChatResponse,
  type OllamaErrorResponse,
  type OllamaMessage,
} from "./src/shared/contratos.ts";

/* ============================== Config ============================== */

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_TIMEOUT_MS = 180_000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_ARQUIVOS = 50;

/** Buckets fixos: mudar num_ctx a cada request força o Ollama a recarregar o modelo. */
const BUCKETS_CTX = [4096, 8192, 12288, LIMITE_CTX] as const;

const DIRETORIOS: Record<CategoriaContexto, string> = {
  perfil: path.resolve(ROOT, "../.ai/perfis"),
  arquitetura: path.resolve(ROOT, "../docs/arch/estado"),
};

/* ============================== Erros ============================== */

class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

/* ============================== Helpers HTTP ============================== */

function enviarJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function enviarErro(res: ServerResponse, err: unknown): void {
  if (err instanceof HttpError) {
    const body: ApiErrorBody = {
      error: { code: err.code, message: err.message },
    };
    enviarJson(res, err.status, body);
    return;
  }
  console.error("[focadu-api] erro inesperado:", err);
  const body: ApiErrorBody = {
    error: {
      code: "ERRO_INTERNO",
      message: err instanceof Error ? err.message : "Erro desconhecido no BFF.",
    },
  };
  enviarJson(res, 500, body);
}

async function lerJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf =
      typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer);
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      throw new HttpError(
        413,
        "PAYLOAD_INVALIDO",
        "Body excede o limite de 1 MB.",
      );
    }
    chunks.push(buf);
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, "PAYLOAD_INVALIDO", "Body não é um JSON válido.");
  }
}

/* ============================== Domínio: arquivos ============================== */

interface ArquivoResolvido {
  id: string;
  nome: string;
  categoria: CategoriaContexto;
  caminho: string;
}

function isCategoria(valor: string): valor is CategoriaContexto {
  return valor === "perfil" || valor === "arquitetura";
}

function listarMarkdown(
  categoria: CategoriaContexto,
  avisos: string[],
): ArquivoContexto[] {
  const dir = DIRETORIOS[categoria];

  if (!fs.existsSync(dir)) {
    avisos.push(`Diretório não encontrado: ${path.relative(ROOT, dir)}`);
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".md"))
    .map((d): ArquivoContexto => {
      const caminho = path.join(dir, d.name);
      const conteudo = fs.readFileSync(caminho, "utf-8");
      return {
        id: `${categoria}/${d.name}`,
        nome: d.name,
        categoria,
        tamanhoBytes: Buffer.byteLength(conteudo, "utf-8"),
        tokensEstimados: estimarTokens(conteudo),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Converte um ID vindo do cliente em caminho absoluto, bloqueando path traversal. */
function resolverArquivo(id: string): ArquivoResolvido {
  const sep = id.indexOf("/");
  const categoria = id.slice(0, sep);
  const nome = id.slice(sep + 1);

  if (
    sep <= 0 ||
    !isCategoria(categoria) ||
    nome !== path.basename(nome) ||
    !nome.toLowerCase().endsWith(".md")
  ) {
    throw new HttpError(
      400,
      "ARQUIVO_INVALIDO",
      `ID de arquivo inválido: "${id}".`,
    );
  }

  const dir = DIRETORIOS[categoria];
  const caminho = path.resolve(dir, nome);

  if (!caminho.startsWith(dir + path.sep) || !fs.existsSync(caminho)) {
    throw new HttpError(
      404,
      "ARQUIVO_INVALIDO",
      `Arquivo não encontrado: "${id}".`,
    );
  }

  return { id, nome, categoria, caminho };
}

function blocoDelimitado(rotulo: string, arquivo: ArquivoResolvido): string {
  const conteudo = fs.readFileSync(arquivo.caminho, "utf-8").trim();
  return [
    `===== [${rotulo}] ${arquivo.nome} — INÍCIO =====`,
    conteudo,
    `===== [${rotulo}] ${arquivo.nome} — FIM =====`,
  ].join("\n");
}

/** Perfis primeiro (comportamento), depois fragmentos de arquitetura (conhecimento). */
function montarSystemPrompt(arquivos: ArquivoResolvido[]): string {
  const perfis = arquivos.filter((a) => a.categoria === "perfil");
  const fragmentos = arquivos.filter((a) => a.categoria === "arquitetura");
  const partes: string[] = [];

  for (const p of perfis) partes.push(blocoDelimitado("PERFIL", p));

  if (fragmentos.length > 0) {
    partes.push(
      "Os blocos a seguir são fragmentos da documentação de arquitetura do projeto. " +
        "Trate-os como fonte de verdade. Se a informação necessária não estiver neles, diga isso explicitamente em vez de inventar.",
    );
    for (const f of fragmentos) partes.push(blocoDelimitado("ARQUITETURA", f));
  }

  return partes.join("\n\n");
}

function calcularNumCtx(tokensEntrada: number): number {
  const necessario = tokensEntrada + RESERVA_RESPOSTA;
  const bucket = BUCKETS_CTX.find((b) => b >= necessario);
  if (bucket === undefined) {
    throw new HttpError(
      413,
      "CONTEXTO_EXCEDIDO",
      `Contexto estimado (~${tokensEntrada} tokens + ${RESERVA_RESPOSTA} de resposta) excede o limite de ${LIMITE_CTX}. ` +
        "Selecione menos fragmentos — o Ollama cortaria o início do prompt (seus perfis!).",
    );
  }
  return bucket;
}

function validarAskRequest(body: unknown): AskRequest {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(
      400,
      "PAYLOAD_INVALIDO",
      "Body deve ser um objeto JSON.",
    );
  }
  const { arquivos, instrucao } = body as Record<string, unknown>;

  if (
    !Array.isArray(arquivos) ||
    !arquivos.every((a): a is string => typeof a === "string")
  ) {
    throw new HttpError(
      400,
      "PAYLOAD_INVALIDO",
      '"arquivos" deve ser um array de strings.',
    );
  }
  if (arquivos.length > MAX_ARQUIVOS) {
    throw new HttpError(
      400,
      "PAYLOAD_INVALIDO",
      `Máximo de ${MAX_ARQUIVOS} arquivos por requisição.`,
    );
  }
  if (typeof instrucao !== "string" || instrucao.trim() === "") {
    throw new HttpError(400, "PAYLOAD_INVALIDO", '"instrucao" é obrigatória.');
  }

  return { arquivos: [...new Set(arquivos)], instrucao: instrucao.trim() };
}

/* ============================== Ollama ============================== */

async function chamarOllama(
  payload: OllamaChatRequest,
  sinalCliente: AbortSignal,
): Promise<OllamaChatResponse> {
  const sinalTimeout = AbortSignal.timeout(OLLAMA_TIMEOUT_MS);
  let res: Response;

  try {
    res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.any([sinalTimeout, sinalCliente]),
    });
  } catch (err) {
    if (sinalCliente.aborted) {
      throw new HttpError(
        499,
        "CANCELADO",
        "Requisição cancelada pelo cliente.",
      );
    }
    if (sinalTimeout.aborted) {
      throw new HttpError(
        504,
        "TIMEOUT",
        `O Ollama não respondeu em ${OLLAMA_TIMEOUT_MS / 1000}s.`,
      );
    }
    const causa = (err as { cause?: { code?: string } }).cause?.code;
    throw new HttpError(
      503,
      "OLLAMA_OFFLINE",
      `Não foi possível conectar ao Ollama em ${OLLAMA_URL}${causa ? ` (${causa})` : ""}. ` +
        "Verifique se ele está rodando.",
    );
  }

  if (!res.ok) {
    const texto = await res.text();
    let mensagem = texto;
    try {
      const json = JSON.parse(texto) as Partial<OllamaErrorResponse>;
      if (typeof json.error === "string") mensagem = json.error;
    } catch {
      /* corpo não-JSON: mantém texto bruto */
    }

    if (res.status === 404 || /not found/i.test(mensagem)) {
      throw new HttpError(
        502,
        "MODELO_NAO_ENCONTRADO",
        `Modelo "${payload.model}" não encontrado no Ollama.`,
      );
    }
    throw new HttpError(
      502,
      "OLLAMA_ERRO",
      `Ollama respondeu HTTP ${res.status}: ${mensagem}`,
    );
  }

  return (await res.json()) as OllamaChatResponse;
}

/* ============================== Handlers ============================== */

function handleContextos(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== "GET") {
    enviarErro(res, new HttpError(405, "METODO_NAO_PERMITIDO", "Use GET."));
    return;
  }
  try {
    const avisos: string[] = [];
    const body: ContextosResponse = {
      perfis: listarMarkdown("perfil", avisos),
      arquitetura: listarMarkdown("arquitetura", avisos),
      avisos,
    };
    enviarJson(res, 200, body);
  } catch (err) {
    enviarErro(res, err);
  }
}

async function handleAsk(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    enviarErro(res, new HttpError(405, "METODO_NAO_PERMITIDO", "Use POST."));
    return;
  }

  // Se o browser cancelar, aborta a geração no Ollama (libera CPU/RAM na hora).
  const cliente = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) cliente.abort();
  });

  try {
    const { arquivos, instrucao } = validarAskRequest(await lerJson(req));
    const resolvidos = arquivos.map(resolverArquivo);
    const systemPrompt = montarSystemPrompt(resolvidos);

    const tokensEntrada =
      estimarTokens(systemPrompt) + estimarTokens(instrucao);
    const numCtx = calcularNumCtx(tokensEntrada);

    const messages: OllamaMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: instrucao });

    const payload: OllamaChatRequest = {
      model: MODELO_OLLAMA,
      messages,
      stream: false,
      options: {
        num_ctx: numCtx,
        num_predict: RESERVA_RESPOSTA,
        temperature: 0.2,
      },
      keep_alive: "5m",
    };

    const inicio = Date.now();
    const ollama = await chamarOllama(payload, cliente.signal);
    if (cliente.signal.aborted) return;

    const body: AskResponse = {
      resposta: ollama.message?.content ?? "",
      meta: {
        modelo: ollama.model,
        arquivosUsados: resolvidos.map((a) => a.id),
        numCtx,
        tokensEstimadosEntrada: tokensEntrada,
        tokensPrompt: ollama.prompt_eval_count ?? null,
        tokensResposta: ollama.eval_count ?? null,
        duracaoMs: ollama.total_duration
          ? Math.round(ollama.total_duration / 1e6)
          : Date.now() - inicio,
        truncada: ollama.done_reason === "length",
      },
    };
    enviarJson(res, 200, body);
  } catch (err) {
    if (cliente.signal.aborted) return;
    enviarErro(res, err);
  }
}

/* ============================== Plugin ============================== */

function focaduApiPlugin(): Plugin {
  return {
    name: "focadu-api",
    configureServer(server) {
      server.middlewares.use("/api/contextos", (req, res) => {
        handleContextos(req, res);
      });
      server.middlewares.use("/api/ask", (req, res) => {
        void handleAsk(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), focaduApiPlugin()],
  server: {
    host: "127.0.0.1", // o BFF lê o disco: nunca exponha na rede
    port: 5173,
  },
});
