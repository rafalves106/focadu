import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useContextos } from "./hooks/useContextos";
import { useSelecao } from "./hooks/useSelecao";
import { useAsk } from "./hooks/useAsk";
import { ColunaContexto } from "./components/ColunaContexto";
import { RespostaMarkdown } from "./components/RespostaMarkdown";
import { AlertaErro } from "./components/AlertaErro";
import {
  LIMITE_CTX,
  MODELO_OLLAMA,
  RESERVA_RESPOSTA,
  estimarTokens,
} from "./shared/contratos";

const LIMITE_ENTRADA = LIMITE_CTX - RESERVA_RESPOSTA;

function corOrcamento(tokens: number): string {
  if (tokens > LIMITE_ENTRADA) return "text-rose-400";
  if (tokens > LIMITE_ENTRADA * 0.5) return "text-amber-400";
  return "text-emerald-400";
}

export default function App() {
  const contextos = useContextos();
  const selecao = useSelecao(contextos.todos);
  const ask = useAsk();
  const [instrucao, setInstrucao] = useState("");

  const tokensTotais = selecao.tokensSelecionados + estimarTokens(instrucao);
  const excedeu = tokensTotais > LIMITE_ENTRADA;
  const podeEnviar = instrucao.trim().length > 0 && !ask.carregando && !excedeu;

  function enviar(): void {
    if (!podeEnviar) return;
    void ask.perguntar({
      arquivos: selecao.selecionados.map((a) => a.id),
      instrucao: instrucao.trim(),
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    enviar();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-emerald-400">focadu</span>
              <span className="text-slate-500">://</span>ai-hub
            </h1>
            <p className="text-xs text-slate-500">
              orquestrador de contexto ·{" "}
              <span className="text-emerald-500/80">{MODELO_OLLAMA}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={contextos.recarregar}
            disabled={contextos.carregando}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40"
          >
            {contextos.carregando ? "↻ lendo disco…" : "↻ recarregar"}
          </button>
        </header>

        {contextos.erro && <AlertaErro erro={contextos.erro} />}
        {contextos.avisos.map((aviso) => (
          <p key={aviso} className="text-xs text-amber-400">
            ⚠ {aviso}
          </p>
        ))}

        {/* Seleção de contexto */}
        <div className="grid gap-4 md:grid-cols-2">
          <ColunaContexto
            indice={1}
            titulo="Perfis (System Prompts)"
            diretorio="../../.ai/perfis/"
            arquivos={contextos.perfis}
            isSelecionado={selecao.isSelecionado}
            onAlternar={selecao.alternar}
            onDefinirVarios={selecao.definirVarios}
            desabilitado={ask.carregando}
          />
          <ColunaContexto
            indice={2}
            titulo="Fragmentos de Arquitetura"
            diretorio="../../docs/arch/estado/"
            arquivos={contextos.arquitetura}
            isSelecionado={selecao.isSelecionado}
            onAlternar={selecao.alternar}
            onDefinirVarios={selecao.definirVarios}
            desabilitado={ask.carregando}
          />
        </div>

        {/* Instrução */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label
            htmlFor="instrucao"
            className="text-sm font-semibold text-emerald-400"
          >
            3. Instrução
          </label>
          <textarea
            id="instrucao"
            value={instrucao}
            onChange={(e) => setInstrucao(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
            placeholder="> descreva a tarefa para a IA…"
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {selecao.selecionados.length} arquivo(s) ·{" "}
              <span className={`tabular-nums ${corOrcamento(tokensTotais)}`}>
                ~{tokensTotais.toLocaleString("pt-BR")} /{" "}
                {LIMITE_ENTRADA.toLocaleString("pt-BR")} tk
              </span>
              <span className="ml-2 hidden text-slate-600 sm:inline">
                ⌘+Enter para enviar
              </span>
            </p>

            <div className="flex gap-2">
              {ask.carregando && (
                <button
                  type="button"
                  onClick={ask.cancelar}
                  className="rounded border border-rose-500/40 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={!podeEnviar}
                className="flex items-center gap-2 rounded bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_16px_-4px_rgba(16,185,129,0.7)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {ask.carregando ? (
                  <>
                    <span className="size-3.5 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                    processando…
                  </>
                ) : (
                  "▶ executar"
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Saída */}
        {ask.erro && <AlertaErro erro={ask.erro} />}

        {ask.carregando && !ask.resposta && (
          <p className="animate-pulse text-sm text-emerald-400/80">
            ▍ o modelo está pensando…
          </p>
        )}

        {ask.resposta && (
          <div
            className={
              ask.carregando
                ? "opacity-40 transition-opacity"
                : "transition-opacity"
            }
          >
            <RespostaMarkdown resposta={ask.resposta} />
          </div>
        )}
      </div>
    </div>
  );
}
