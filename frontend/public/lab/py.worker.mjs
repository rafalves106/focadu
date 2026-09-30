// Fase 87: runtime Python do laboratorio - Pyodide (CPython em WebAssembly) num Worker de modulo.
// Mensagens: init { files, packages } -> progress* + ready | init-error; run { id, script, argv, entry } -> result | error.
import { loadPyodide } from './pyodide/pyodide.mjs';

const SCAPY_WHEEL = './vendor/scapy-2.7.0-py3-none-any.whl';

// O Pyodide vem sem IPv6 e o Scapy nao importa sem isto (spike de 30/09/2026): troca inet_pton/inet_ntop
// por versoes em Python puro antes do `import scapy`.
const SCAPY_SHIM = `
import socket, ipaddress, logging
socket.has_ipv6 = True
_p, _n = socket.inet_pton, socket.inet_ntop
socket.inet_pton = lambda af, a: ipaddress.IPv6Address(a).packed if af == socket.AF_INET6 else _p(af, a)
socket.inet_ntop = lambda af, b: str(ipaddress.IPv6Address(bytes(b))) if af == socket.AF_INET6 else _n(af, b)
logging.getLogger("scapy").setLevel(logging.ERROR)
`;

// Roda o script do aluno como __main__ e devolve o exit code; o traceback mostra so os quadros do arquivo dele.
const RUN_SCRIPT = `
import sys, traceback
def __lab_run(src, argv, entry):
    sys.argv = list(argv)
    g = {"__name__": "__main__", "__file__": entry}
    try:
        exec(compile(src, entry, "exec"), g)
        return 0
    except SystemExit as e:
        if e.code is None or isinstance(e.code, int):
            return e.code or 0
        print(e.code, file=sys.stderr)
        return 1
    except BaseException:
        et, ev, tb = sys.exc_info()
        while tb is not None and tb.tb_frame.f_code.co_filename != entry:
            tb = tb.tb_next
        sys.stderr.write("Traceback (most recent call last):\\n" + "".join(traceback.format_tb(tb)) + "".join(traceback.format_exception_only(et, ev)))
        return 1
`;

let py = null;

const say = (message) => postMessage(message);

/** Baixa um arquivo contando os bytes - aquece o cache HTTP que o proprio Pyodide vai usar logo depois. */
async function warm(url, tally, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não consegui baixar ${url} (${response.status}).`);
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    tally.loaded += value.length;
    const now = Date.now();
    if (now - tally.last > 100) {
      tally.last = now;
      say({ type: 'progress', label, loaded: tally.loaded, total: tally.total });
    }
  }
  say({ type: 'progress', label, loaded: tally.loaded, total: tally.total });
}

let manifest = null;

/** Tamanho real do arquivo (sem compressao), do manifest.json gerado por scripts/lab-assets.mjs. */
async function sizeOf(url) {
  manifest ??= await (await fetch('./manifest.json')).json();
  return manifest[url.replace(/^\.\//, '')] ?? 0;
}

async function init({ files, packages }) {
  const wantsScapy = packages.includes('scapy');
  const unknown = packages.filter((p) => p !== 'scapy');
  if (unknown.length) throw new Error(`Pacote sem suporte no laboratório: ${unknown.join(', ')}.`);

  const heavy = ['./pyodide/pyodide.asm.wasm', './pyodide/python_stdlib.zip', './pyodide/pyodide.asm.mjs', ...(wantsScapy ? [SCAPY_WHEEL] : [])];
  const tally = { loaded: 0, last: 0, total: (await Promise.all(heavy.map(sizeOf))).reduce((a, b) => a + b, 0) };
  const label = wantsScapy ? 'Python + Scapy' : 'Python';
  for (const url of heavy) await warm(url, tally, label);

  say({ type: 'progress', label: 'Iniciando o Python', loaded: tally.total, total: tally.total });
  py = await loadPyodide({
    indexURL: './pyodide/',
    stdout: (text) => say({ type: 'out', text: `${text}\n` }),
    stderr: (text) => say({ type: 'out', text: `${text}\n` }),
  });
  for (const f of files) py.FS.writeFile(f.name, new Uint8Array(f.data));
  if (wantsScapy) {
    await py.loadPackage('micropip'); // vem do pyodide-lock.json e do arquivo ao lado (indexURL)
    await py.runPythonAsync(`import micropip\nawait micropip.install(${JSON.stringify(new URL(SCAPY_WHEEL, self.location).href)})`);
    await py.runPythonAsync(SCAPY_SHIM);
  }
  await py.runPythonAsync(RUN_SCRIPT);
}

async function run({ script, argv, entry }) {
  const lines = [];
  // stdout e stderr chegam juntos e em ordem, como no terminal; o runner guarda o parcial pra um timeout.
  const emit = (text) => {
    // Aviso que o proprio Scapy imprime ao importar no Pyodide (I/O de rede nao existe aqui, e a ponte nao usa): ruido pro aluno.
    if (text.startsWith('CRITICAL: Scapy currently does not support emscripten')) return;
    lines.push(`${text}\n`);
    say({ type: 'out', text: `${text}\n` });
  };
  py.setStdout({ batched: emit });
  py.setStderr({ batched: emit });
  const exitCode = await py.globals.get('__lab_run')(script, argv, entry);
  return { output: lines.join(''), exitCode: Number(exitCode) };
}

onmessage = async (e) => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      await init(m);
      say({ type: 'ready' });
    } catch (err) {
      say({ type: 'init-error', message: err instanceof Error ? err.message : String(err) });
    }
  } else if (m.type === 'run') {
    try {
      const result = await run(m);
      say({ type: 'result', id: m.id, ...result });
    } catch (err) {
      say({ type: 'error', id: m.id, message: err instanceof Error ? err.message : String(err) });
    }
  }
};
