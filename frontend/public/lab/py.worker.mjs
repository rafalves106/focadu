// Fase 87: runtime Python do laboratorio - Pyodide (CPython em WebAssembly) num Worker de modulo.
// Fase 95: o mesmo Worker roda o runtime sqlite - o aluno escreve SQL puro e quem executa e o sqlite3 da
// biblioteca padrao do Pyodide (SQLite 3.39), sem pacote extra.
// Mensagens: init { runtime, files, packages, setup } -> progress* + ready | init-error; run { id, script, argv, entry } -> result | error.
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

// Fase 95: o runtime sqlite. Cada execucao comeca de um banco novo em memoria (resultado deterministico pra avaliar):
// carrega os arquivos do dia (.db via backup, .sql via executescript), roda lab.setup e depois o SQL do aluno, um
// comando por vez - SELECT vira tabela em texto, INSERT/UPDATE/DELETE dizem quantas linhas mudaram, erro para tudo
// com "Erro na linha N" (o editor marca a linha). PRAGMA foreign_keys fica no padrao do SQLite (desligado), como na
// aula; o dia liga no setup quando precisar.
const SQL_RUNNER = `
import sqlite3, sys
def __lab_sql_split(src):
    """Quebra o SQL em comandos completos (sqlite3.complete_statement) e devolve [(linha_inicial, texto)].
    Comando de ponto (.tables) so vale no comeco da linha, fora de um comando pela metade."""
    out, buf, first = [], "", 1
    def blank(text):
        return all(not l.strip() or l.strip().startswith("--") for l in text.split("\\n"))
    def emit(text, line):
        lines = text.split("\\n")
        while lines and (not lines[0].strip() or lines[0].strip().startswith("--")):
            lines.pop(0)
            line += 1
        body = "\\n".join(lines).strip()
        if body and body != ";":
            out.append((line, body))
    for n, line in enumerate(src.split("\\n"), 1):
        if blank(buf) and line.strip().startswith("."):
            out.append((n, line.strip()))
            buf, first = "", n + 1
            continue
        if blank(buf) and not buf:
            first = n
        pieces = line.split(";")
        for i, piece in enumerate(pieces):
            buf += piece
            if i < len(pieces) - 1:
                buf += ";"
                if sqlite3.complete_statement(buf):
                    emit(buf, first)
                    buf, first = "", n
        buf += "\\n"
    if not blank(buf):
        emit(buf, first)
    return out

def __lab_sql_cell(v):
    if v is None:
        return "NULL"
    if isinstance(v, bytes):
        return "x'" + v.hex() + "'"
    return str(v)

def __lab_sql_table(names, rows, gap):
    if gap:
        print()
    cells = [[__lab_sql_cell(v) for v in r] for r in rows]
    widths = [max([len(n)] + [len(r[i]) for r in cells]) for i, n in enumerate(names)]
    fmt = lambda vals: "  ".join(v.ljust(w) for v, w in zip(vals, widths)).rstrip()
    lines = [fmt(names), "  ".join("-" * w for w in widths)]
    lines += [fmt(r) for r in cells]
    if not cells:
        lines.append("(nenhuma linha)")
    print("\\n".join(lines))

def __lab_sql_dot(con, cmd):
    parts = cmd.split()
    if parts[0] == ".tables":
        names = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        print("  ".join(names) if names else "(nenhuma tabela)")
    elif parts[0] == ".schema":
        if len(parts) > 1:
            rows = con.execute("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND lower(tbl_name) = lower(?) ORDER BY type DESC, name", (parts[1],)).fetchall()
        else:
            rows = con.execute("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC, name").fetchall()
        for (sql,) in rows:
            print(sql + ";")
        if not rows:
            print("(nenhuma tabela" + (" " + parts[1] if len(parts) > 1 else "") + ")")
    else:
        print("Aviso: aqui só valem os comandos de ponto .tables e .schema (" + parts[0] + " ignorado).", file=sys.stderr)

def __lab_sql_run(src, files, setup):
    con = sqlite3.connect(":memory:", isolation_level=None)  # autocommit: BEGIN/COMMIT/ROLLBACK do aluno valem como escritos
    try:
        # O backup substitui o banco inteiro: o .db (no maximo um) entra antes dos .sql e do setup.
        dbs = [n for n in files if n.lower().endswith((".db", ".sqlite", ".sqlite3"))]
        if len(dbs) > 1:
            print("Erro no banco do dia: use no máximo um arquivo .db (" + ", ".join(dbs) + ").", file=sys.stderr)
            return 1
        for name in dbs:
            src_db = sqlite3.connect(name)
            src_db.backup(con)
            src_db.close()
        for name in files:
            if name.lower().endswith(".sql"):
                with open(name, encoding="utf-8") as f:
                    con.executescript(f.read())
        for cmd in setup:
            con.executescript(cmd)
    except sqlite3.Error as e:
        print("Erro no banco do dia (setup): " + str(e), file=sys.stderr)
        return 1
    printed = False  # linha em branco entre duas tabelas seguidas
    for line, cmd in __lab_sql_split(src):
        if cmd.startswith("."):
            __lab_sql_dot(con, cmd)
            printed = True
            continue
        try:
            cur = con.execute(cmd)
            if cur.description:
                __lab_sql_table([d[0] for d in cur.description], cur.fetchall(), printed)
                printed = True
            elif cur.rowcount >= 0 and cmd.lstrip().split(None, 1)[0].upper() in ("INSERT", "UPDATE", "DELETE", "REPLACE"):
                n = cur.rowcount
                print("-- " + str(n) + (" linha alterada" if n == 1 else " linhas alteradas"))
                printed = True
        except sqlite3.Error as e:
            print("Erro na linha " + str(line) + ": " + str(e), file=sys.stderr)
            return 1
    return 0
`;

let py = null;
let sqlMode = null; // { files, setup } quando o runtime e sqlite

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

async function init({ runtime, files, packages, setup }) {
  if (runtime === 'sqlite' && packages.length) throw new Error('O laboratório de SQL não instala pacotes.');
  const wantsScapy = packages.includes('scapy');
  const unknown = packages.filter((p) => p !== 'scapy');
  if (unknown.length) throw new Error(`Pacote sem suporte no laboratório: ${unknown.join(', ')}.`);

  const heavy = ['./pyodide/pyodide.asm.wasm', './pyodide/python_stdlib.zip', './pyodide/pyodide.asm.mjs', ...(wantsScapy ? [SCAPY_WHEEL] : [])];
  const tally = { loaded: 0, last: 0, total: (await Promise.all(heavy.map(sizeOf))).reduce((a, b) => a + b, 0) };
  const label = runtime === 'sqlite' ? 'SQLite' : wantsScapy ? 'Python + Scapy' : 'Python';
  for (const url of heavy) await warm(url, tally, label);

  say({ type: 'progress', label: runtime === 'sqlite' ? 'Iniciando o SQLite' : 'Iniciando o Python', loaded: tally.total, total: tally.total });
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
  if (runtime === 'sqlite') {
    await py.runPythonAsync(SQL_RUNNER);
    sqlMode = { files: files.map((f) => f.name), setup: setup ?? [] };
  }
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
  const exitCode = sqlMode
    ? py.globals.get('__lab_sql_run')(script, py.toPy(sqlMode.files), py.toPy(sqlMode.setup))
    : await py.globals.get('__lab_run')(script, argv, entry);
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
