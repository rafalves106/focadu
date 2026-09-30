// Fase 87: o "anfitriao" do laboratorio de codigo. Vive na pagina /lab/runner.html (iframe escondido) e
// conversa com o app por postMessage; cada runtime roda num Worker proprio, que o runner derruba e recria
// quando o codigo passa do tempo ou o aluno manda parar.
//
// Mensagens do app -> runner (todas com `id`; a resposta volta como { id, ok, ... }):
//   init    { runtime: 'python'|'javascript'|'bash', image?, files: [{ name, data: ArrayBuffer }], packages, services, timeoutSeconds }
//   run     { script, argv, entry }        python/javascript: roda o script inteiro
//   exec    { command }                    bash: roda um comando no terminal
//   write   { path, text }                 bash: grava um arquivo na VM (ex.: o que o aluno editou)
//   abort   {}                             derruba o que estiver rodando e sobe o runtime de novo
//   dispose {}
// Eventos do runner -> app (sem `id`): { event: 'progress', label, loaded, total } e { event: 'status', status }.
//
// Seguranca: a CSP desta pagina e dos Workers libera `connect-src` so em /lab/ - o codigo do aluno nao alcanca
// a API da Focada nem outra origem (verificado no spike de 30/09/2026).

const WORKERS = { python: './py.worker.mjs', javascript: './js.worker.mjs', bash: './linux.worker.mjs' };

/** @type {{ worker: Worker, output: string[] } | null} */
let engine = null;
/** Parametros do ultimo init: o runtime e recriado com eles depois de um timeout/abort. */
let initParams = null;
let pending = null; // { id, finish } do run/exec em andamento

function reply(id, payload) {
  parent.postMessage({ id, ...payload }, '*');
}

function emit(event) {
  parent.postMessage(event, '*');
}

function startWorker(params) {
  const worker = new Worker(WORKERS[params.runtime], { type: 'module' });
  const state = { worker, output: [] };
  worker.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'progress') emit({ event: 'progress', label: m.label, loaded: m.loaded, total: m.total });
    else if (m.type === 'out') state.output.push(m.text);
  });
  return state;
}

/** Sobe o Worker e espera o `ready` (com o progresso repassado ao app). */
function boot(params) {
  return new Promise((resolve, reject) => {
    engine = startWorker(params);
    const worker = engine.worker;
    const onMessage = (e) => {
      if (e.data.type === 'ready') {
        worker.removeEventListener('message', onMessage);
        resolve(e.data);
      } else if (e.data.type === 'init-error') {
        worker.removeEventListener('message', onMessage);
        reject(new Error(e.data.message));
      }
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (e) => reject(new Error(e.message || 'O laboratório não conseguiu iniciar.')));
    // Copia em vez de transferir: o init e repetido depois de um timeout e os arquivos precisam continuar aqui.
    worker.postMessage({ type: 'init', ...params, files: params.files.map((f) => ({ name: f.name, data: f.data.slice(0) })) });
  });
}

function killEngine() {
  if (engine) engine.worker.terminate();
  engine = null;
}

/** Roda uma mensagem no Worker e espera o `result`; estoura em `timeoutSeconds` derrubando o Worker. */
function call(id, type, payload) {
  return new Promise((resolve) => {
    if (!engine) {
      resolve({ ok: false, error: 'O laboratório ainda não está pronto.' });
      return;
    }
    const current = engine;
    current.output.length = 0;
    const started = performance.now();
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      pending = null;
      current.worker.removeEventListener('message', onMessage);
      resolve(value);
    };
    const onMessage = (e) => {
      const m = e.data;
      if (m.type === 'result' && m.id === id) {
        finish({ ok: true, output: m.output, exitCode: m.exitCode, timedOut: false, aborted: false, ms: Math.round(performance.now() - started) });
      } else if (m.type === 'error' && m.id === id) {
        finish({ ok: false, error: m.message });
      }
    };
    current.worker.addEventListener('message', onMessage);
    const limit = (initParams?.timeoutSeconds ?? 10) * 1000;
    const timer = setTimeout(() => {
      const partial = current.output.join('');
      killEngine();
      finish({ ok: true, output: partial, exitCode: 124, timedOut: true, aborted: false, ms: limit });
    }, limit);
    pending = {
      id,
      finish: () => {
        const partial = current.output.join('');
        killEngine();
        finish({ ok: true, output: partial, exitCode: 130, timedOut: false, aborted: true, ms: Math.round(performance.now() - started) });
      },
    };
    current.worker.postMessage({ type, id, ...payload });
  });
}

/** Depois de um timeout/abort o runtime precisa subir de novo antes do proximo comando. */
async function ensureEngine() {
  if (engine || !initParams) return;
  emit({ event: 'status', status: 'restarting' });
  await boot(initParams);
  emit({ event: 'status', status: 'ready' });
}

window.addEventListener('message', async (e) => {
  if (e.source !== parent) return;
  const { id, type, ...rest } = e.data ?? {};
  try {
    if (type === 'init') {
      killEngine();
      initParams = { timeoutSeconds: 10, packages: [], services: [], files: [], ...rest };
      const info = await boot(initParams);
      reply(id, { ok: true, ...info });
    } else if (type === 'run' || type === 'exec' || type === 'write') {
      await ensureEngine();
      reply(id, await call(id, type, rest));
    } else if (type === 'abort') {
      if (pending) pending.finish();
      else killEngine();
      reply(id, { ok: true });
    } else if (type === 'dispose') {
      killEngine();
      initParams = null;
      reply(id, { ok: true });
    }
  } catch (err) {
    reply(id, { ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

parent.postMessage({ event: 'loaded' }, '*');
