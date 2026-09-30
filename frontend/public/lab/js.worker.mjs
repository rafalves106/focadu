// Fase 87: runtime JavaScript do laboratorio - o codigo do aluno roda como modulo ES (import dinamico de um
// Blob) num Worker, com uma camada minima de "Node": `process.argv`, `console` capturado e o pcap-parser
// empacotado (`fs` virtual lendo os arquivos do dia da memoria). So essa lib existe aqui; outra ponte em
// JavaScript com outra lib precisa do shim dela (CURADORIA.md 5.2) ou fica no fluxo antigo.
// Mensagens: init { files } -> ready | init-error; run { id, script, argv } -> result | error.

const PCAP_BUNDLE = new URL('./js/pcap-parser.mjs', self.location).href;

class ExitSignal {
  constructor(code) {
    this.code = code;
  }
}

const say = (message) => postMessage(message);

async function init({ files, packages }) {
  const unknown = packages.filter((p) => p !== 'pcap-parser');
  if (unknown.length) throw new Error(`Pacote sem suporte no laboratório: ${unknown.join(', ')}.`);

  self.__files = {};
  for (const f of files) self.__files[f.name] = new Uint8Array(f.data);
  say({ type: 'progress', label: 'JavaScript', loaded: 0, total: 1 });
  await import(PCAP_BUNDLE); // liga Buffer/process e o fs virtual
  self.process.exit = (code = 0) => {
    throw new ExitSignal(code);
  };
  say({ type: 'progress', label: 'JavaScript', loaded: 1, total: 1 });
}

function format(args) {
  return args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? (a.stack ?? String(a)) : JSON.stringify(a) ?? String(a))).join(' ');
}

async function run({ script, argv }) {
  const lines = [];
  const push = (...args) => {
    const text = `${format(args)}\n`;
    lines.push(text);
    say({ type: 'out', text });
  };
  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  console.log = console.info = console.warn = console.error = push;
  self.process.argv = argv;

  const source = script.replace(/from\s+["']pcap-parser["']/g, `from "${PCAP_BUNDLE}"`);
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  let exitCode = 0;
  try {
    await import(url);
  } catch (err) {
    if (err instanceof ExitSignal) {
      exitCode = Number(err.code) || 0;
    } else {
      push(err instanceof Error ? (err.stack ?? String(err)) : String(err));
      exitCode = 1;
    }
  } finally {
    URL.revokeObjectURL(url);
    Object.assign(console, original);
  }
  return { output: lines.join(''), exitCode };
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
      say({ type: 'result', id: m.id, ...(await run(m)) });
    } catch (err) {
      say({ type: 'error', id: m.id, message: err instanceof Error ? err.message : String(err) });
    }
  }
};
