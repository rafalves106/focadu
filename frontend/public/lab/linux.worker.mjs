// Fase 87: runtime Linux do laboratorio - Alpine i386 com Bash num emulador x86 (v86) dentro de um Worker.
// Imagens montadas por secret/curadoria/scripts/lab/montar_imagem.sh: kernel unico (linux/vmlinuz) e um
// initramfs por perfil (linux/<basico|servidor>/initrd.zst). O terminal conversa pela porta serial.
// Mensagens: init { image, files, services, setup, user } -> progress* + ready | init-error;
//            exec { id, command } / write { id, path, text } -> result | error.
import { V86 } from './v86/libv86.mjs';

const say = (message) => postMessage(message);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let emu = null;

/** Digita no terminal da VM em UTF-8 (`serial0_send` do v86 manda so o codigo de cada caractere: acento viraria byte invalido). */
function type(text) {
  for (const byte of new TextEncoder().encode(text)) emu.bus.send('serial0-input', byte);
}
let serial = '';
const decoder = new TextDecoder('utf-8');

async function fetchBytes(url, tally, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não consegui baixar ${url} (${response.status}).`);
  const reader = response.body.getReader();
  const parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    tally.loaded += value.length;
    const now = Date.now();
    if (now - tally.last > 100) {
      tally.last = now;
      say({ type: 'progress', label, loaded: tally.loaded, total: tally.total });
    }
  }
  say({ type: 'progress', label, loaded: tally.loaded, total: tally.total });
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out.buffer;
}

let manifest = null;

/** Tamanho real do arquivo (sem compressao), do manifest.json gerado por scripts/lab-assets.mjs. */
async function sizeOf(url) {
  manifest ??= await (await fetch('./manifest.json')).json();
  return manifest[url.replace(/^\.\//, '')] ?? 0;
}

/**
 * Roda um comando no Bash da VM e devolve saida + exit code + diretorio atual. O marcador `__END<id>:<rc>:<pwd>`
 * fecha o comando (o `$?` vem antes do `$PWD`, entao ainda e o do comando do aluno).
 */
async function sh(command, limitMs = 120000) {
  serial = '';
  const id = Math.random().toString(36).slice(2, 8);
  type(`${command}\necho __EN''D${id}:$?:$PWD\n`);
  const end = new RegExp(`\\r\\n__END${id}:(\\d+):([^\\r\\n]*)\\r\\n`);
  const started = Date.now();
  let match = null;
  while (!(match = end.exec(serial))) {
    await sleep(25);
    if (Date.now() - started > limitMs) throw new Error('O terminal do laboratório não respondeu.');
  }
  const output = serial
    .slice(0, match.index)
    .split('\n')
    .slice(1) // a 1a linha e o proprio comando, devolvido pelo eco do terminal
    .join('\n')
    .replace(/\r/g, '')
    .replace(/~%+ echo __EN[\s\S]*$/, '')
    .replace(/\n$/, '');
  return { output, exitCode: Number(match[1]), cwd: match[2] };
}

async function writeFile(path, text) {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : new Uint8Array(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(binary).replace(/(.{76})/g, '$1\n');
  await sh(`cat > /tmp/up.b64 <<'EOFB64'\n${b64}\nEOFB64`);
  await sh(`base64 -d /tmp/up.b64 > ${path}`);
}

/** Entra no terminal de `user` (a shell de root e trocada: `exec su -`) e deixa o prompt/paste como o resto do laboratorio espera. */
async function enterAs(user) {
  serial = '';
  type(`exec su - ${user}\n`);
  const started = Date.now();
  // A shell nova demora um instante; repete o eco ate ela responder.
  for (;;) {
    await sleep(300);
    serial = '';
    type("echo __RE''ADY\n");
    await sleep(300);
    if (/__READY\r?\n/.test(serial)) break;
    if (Date.now() - started > 20000) throw new Error(`Não consegui entrar como ${user} no laboratório.`);
  }
  await sh("bind 'set enable-bracketed-paste off'; PS1='~% '");
}

async function init({ image, files, services, setup = [], user = null }) {
  const initrd = `./linux/${image}/initrd.zst`;
  const urls = ['./linux/vmlinuz', initrd, './vendor/bios/seabios.bin', './vendor/bios/vgabios.bin'];
  const tally = { loaded: 0, last: 0, total: (await Promise.all(urls.map(sizeOf))).reduce((a, b) => a + b, 0) };
  const buffers = [];
  for (const url of urls) buffers.push(await fetchBytes(url, tally, 'Linux'));
  const [kernelBuf, initrdBuf, biosBuf, vgaBuf] = buffers;

  say({ type: 'progress', label: 'Iniciando o Linux', loaded: tally.total, total: tally.total });
  serial = '';
  emu = new V86({
    wasm_path: './v86/v86.wasm',
    bios: { buffer: biosBuf },
    vga_bios: { buffer: vgaBuf },
    bzimage: { buffer: kernelBuf },
    initrd: { buffer: initrdBuf },
    cmdline: 'console=ttyS0 tsc=reliable mitigations=off random.trust_cpu=on',
    memory_size: (image === 'servidor' ? 256 : 128) * 1024 * 1024,
    autostart: true,
    disable_keyboard: true,
    disable_mouse: true,
  });
  emu.add_listener('serial0-output-byte', (byte) => {
    serial += decoder.decode(Uint8Array.of(byte), { stream: true });
  });

  const booted = Date.now();
  while (!/# $/.test(serial)) {
    await sleep(50);
    if (Date.now() - booted > 120000) throw new Error('O Linux do laboratório não iniciou.');
  }
  await sh("bind 'set enable-bracketed-paste off'; PS1='~% '");

  // Ambiente do dia (curadoria): linhas de shell como root (usuarios, grupos, arquivos) e depois o terminal entra como `user`.
  if (setup.length) {
    say({ type: 'progress', label: 'Montando o ambiente', loaded: 0, total: setup.length });
    for (const [i, line] of setup.entries()) {
      const { output, exitCode } = await sh(line);
      if (exitCode !== 0) throw new Error(`O ambiente do laboratório falhou em "${line}": ${output.trim().slice(0, 200)}`);
      say({ type: 'progress', label: 'Montando o ambiente', loaded: i + 1, total: setup.length });
    }
  }
  if (user) await enterAs(user);
  const home = user ? `/home/${user}` : '/root';

  say({ type: 'progress', label: 'Preparando os arquivos', loaded: 0, total: Math.max(files.length, 1) });
  for (const [i, f] of files.entries()) {
    await writeFile(`${home}/${f.name}`, f.data);
    say({ type: 'progress', label: 'Preparando os arquivos', loaded: i + 1, total: files.length });
  }

  if (services.length) {
    say({ type: 'progress', label: 'Iniciando o servidor do laboratório', loaded: 0, total: 1 });
    for (const service of services) {
      const exe = service.endsWith('.py') ? 'python3' : 'bash';
      await sh(`cd ${home}; (${exe} ${service} >/dev/null 2>&1 &)`);
    }
    // O Python na CPU emulada leva ~15 s pra abrir a porta: espera aparecer um socket em LISTEN (estado 0A).
    const started = Date.now();
    for (;;) {
      const { output } = await sh(`awk 'NR>1 && $4=="0A"' /proc/net/tcp | wc -l`);
      if (Number(output.trim()) > 0) break;
      if (Date.now() - started > 90000) throw new Error('O servidor do laboratório não abriu a porta.');
      await sleep(1000);
    }
  }
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
  } else if (m.type === 'exec') {
    try {
      say({ type: 'result', id: m.id, ...(await sh(m.command)) });
    } catch (err) {
      say({ type: 'error', id: m.id, message: err instanceof Error ? err.message : String(err) });
    }
  } else if (m.type === 'write') {
    try {
      await writeFile(m.path, m.text);
      say({ type: 'result', id: m.id, output: '', exitCode: 0, cwd: null });
    } catch (err) {
      say({ type: 'error', id: m.id, message: err instanceof Error ? err.message : String(err) });
    }
  }
};
