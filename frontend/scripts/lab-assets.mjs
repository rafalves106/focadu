// Fase 87: monta os arquivos do laboratorio de codigo em public/lab/ (servidos em /lab/).
// Gerados aqui (nao vao pro git): Pyodide, o v86 e o pcap-parser empacotado pro navegador. Versionados em
// public/lab/: o wheel do Scapy (vendor/), a BIOS do v86 (vendor/bios/), o kernel e as imagens do Linux
// (linux/, montadas por secret/curadoria/scripts/lab/montar_imagem.sh).
// Roda sozinho antes do dev e do build (predev/prebuild) e e idempotente.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lab = join(root, 'public', 'lab');
const nm = join(root, 'node_modules');

function copy(from, to) {
  if (!existsSync(from)) throw new Error(`lab-assets: falta ${from} (rode npm ci)`);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
}

// 1. Pyodide: so o que o laboratorio carrega (nucleo, biblioteca padrao, lista de pacotes e o micropip).
const pyodideOut = join(lab, 'pyodide');
rmSync(pyodideOut, { recursive: true, force: true });
const pyodideDist = join(nm, 'pyodide');
for (const name of ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'pyodide.mjs', 'python_stdlib.zip', 'pyodide-lock.json']) {
  copy(join(pyodideDist, name), join(pyodideOut, name));
}
// O npm do Pyodide nao traz os wheels dos pacotes: o micropip (que instala o Scapy) fica versionado em
// vendor/ e entra ao lado do nucleo, onde o pyodide-lock.json espera achar.
for (const name of readdirSync(join(lab, 'vendor')).filter((n) => /^micropip-.*\.whl$/.test(n))) {
  copy(join(lab, 'vendor', name), join(pyodideOut, name));
}

// 2. v86 (Linux emulado): o modulo e o wasm.
const v86Out = join(lab, 'v86');
rmSync(v86Out, { recursive: true, force: true });
copy(join(nm, 'v86', 'build', 'libv86.mjs'), join(v86Out, 'libv86.mjs'));
copy(join(nm, 'v86', 'build', 'v86.wasm'), join(v86Out, 'v86.wasm'));

// 3. pcap-parser pra ponte em JavaScript: lib feita pro Node, empacotada com `fs` virtual (le do arquivo em
// memoria), Buffer, process e stream de polyfill (scripts/lab/*). So essa lib: outra ponte em JavaScript
// com outra lib precisa do shim dela (CURADORIA.md 5.2).
await build({
  entryPoints: [join(root, 'scripts', 'lab', 'pcap-entry.mjs')],
  outfile: join(lab, 'js', 'pcap-parser.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
  inject: [join(root, 'scripts', 'lab', 'inject.mjs')],
  alias: {
    fs: join(root, 'scripts', 'lab', 'shim-fs.mjs'),
    stream: 'stream-browserify',
    buffer: 'buffer',
    events: 'events',
    util: 'util',
  },
  define: { global: 'globalThis' },
  logLevel: 'warning',
});

// 4. Os arquivos versionados tem que existir (o laboratorio nao sobe sem eles).
for (const rel of [
  'vendor/scapy-2.7.0-py3-none-any.whl',
  'vendor/micropip-0.11.1-py3-none-any.whl',
  'vendor/bios/seabios.bin',
  'vendor/bios/vgabios.bin',
  'linux/vmlinuz',
  'linux/basico/initrd.zst',
  'linux/servidor/initrd.zst',
]) {
  if (!existsSync(join(lab, rel))) throw new Error(`lab-assets: falta public/lab/${rel} (versionado no git)`);
}
// 5. manifest.json: tamanho REAL (sem compressao) de cada arquivo. Os Workers usam isto pra barra de progresso: com
// gzip o Content-Length do HEAD e o comprimido, mas o que se conta ao baixar e o descomprimido.
function walk(dir, base = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name), `${base}${entry.name}/`) : [[`${base}${entry.name}`, statSync(join(dir, entry.name)).size]],
  );
}
const sizes = Object.fromEntries(walk(lab).filter(([name]) => name !== 'manifest.json'));
writeFileSync(join(lab, 'manifest.json'), JSON.stringify(sizes));
console.log('lab-assets: public/lab pronto (pyodide, v86, pcap-parser, manifest).');
