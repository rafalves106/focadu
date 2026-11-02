import type { ArquivoContexto } from "../shared/contratos";

interface ColunaContextoProps {
  indice: number;
  titulo: string;
  diretorio: string;
  arquivos: ArquivoContexto[];
  isSelecionado: (id: string) => boolean;
  onAlternar: (id: string) => void;
  onDefinirVarios: (ids: string[], marcar: boolean) => void;
  desabilitado: boolean;
}

export function ColunaContexto({
  indice,
  titulo,
  diretorio,
  arquivos,
  isSelecionado,
  onAlternar,
  onDefinirVarios,
  desabilitado,
}: ColunaContextoProps) {
  const ids = arquivos.map((a) => a.id);
  const qtdSelecionados = ids.filter(isSelecionado).length;
  const todosMarcados =
    arquivos.length > 0 && qtdSelecionados === arquivos.length;

  return (
    <section className="flex flex-col rounded-lg border border-slate-700/60 bg-slate-950/40">
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-emerald-400">
            {indice}. {titulo}
          </h2>
          <p className="truncate text-[11px] text-slate-500">{diretorio}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs">
          <span className="tabular-nums text-slate-500">
            {qtdSelecionados}/{arquivos.length}
          </span>
          <button
            type="button"
            disabled={desabilitado || arquivos.length === 0}
            onClick={() => onDefinirVarios(ids, !todosMarcados)}
            className="text-emerald-500/80 hover:text-emerald-300 disabled:opacity-30"
          >
            {todosMarcados ? "[ nenhum ]" : "[ todos ]"}
          </button>
        </div>
      </header>

      {arquivos.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-slate-600">
          // nenhum arquivo .md
        </p>
      ) : (
        <ul className="max-h-72 overflow-y-auto p-2">
          {arquivos.map((arquivo) => (
            <li key={arquivo.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 transition-colors hover:bg-slate-800/60 has-checked:bg-emerald-500/10">
                <input
                  type="checkbox"
                  className="size-4 accent-emerald-500"
                  checked={isSelecionado(arquivo.id)}
                  onChange={() => onAlternar(arquivo.id)}
                  disabled={desabilitado}
                />
                <span className="flex-1 truncate text-sm text-slate-300">
                  {arquivo.nome}
                </span>
                <span className="text-[11px] tabular-nums text-slate-500">
                  ~{arquivo.tokensEstimados.toLocaleString("pt-BR")} tk
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
