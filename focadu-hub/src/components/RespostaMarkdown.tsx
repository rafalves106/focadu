import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useClipboard } from "../hooks/useClipboard";
import type { AskResponse } from "../shared/contratos";

interface RespostaMarkdownProps {
  resposta: AskResponse;
}

export function RespostaMarkdown({ resposta }: RespostaMarkdownProps) {
  const { copiado, copiar } = useClipboard();
  const { meta } = resposta;

  return (
    <section className="rounded-lg border border-emerald-500/30 bg-slate-950/60 shadow-[0_0_24px_-8px_rgba(16,185,129,0.35)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span className="text-emerald-400">▸ {meta.modelo}</span>
        <span className="flex flex-wrap gap-x-4 tabular-nums">
          <span>ctx {meta.numCtx}</span>
          <span>in {meta.tokensPrompt ?? "?"} tk</span>
          <span>out {meta.tokensResposta ?? "?"} tk</span>
          {meta.duracaoMs !== null && (
            <span>{(meta.duracaoMs / 1000).toFixed(1)}s</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => void copiar(resposta.resposta)}
          className="text-emerald-500/80 hover:text-emerald-300"
        >
          {copiado ? "[ copiado ✓ ]" : "[ copiar ]"}
        </button>
      </header>

      {meta.truncada && (
        <p className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
          ⚠ Resposta cortada pelo limite de tokens de saída (num_predict).
        </p>
      )}

      <div className="prose prose-invert prose-sm max-w-none px-5 py-4 prose-headings:text-emerald-300 prose-a:text-emerald-400 prose-code:text-emerald-300 prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-slate-800 prose-pre:bg-slate-900">
        <Markdown remarkPlugins={[remarkGfm]}>{resposta.resposta}</Markdown>
      </div>
    </section>
  );
}
