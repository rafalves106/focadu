import type { LabRuntime } from '../api/types';

/** Fase 87: um passo do download/boot do runtime, pra barra de progresso ("Python + Scapy 5,4 de 9 MB"). */
export interface LabProgress {
  label: string;
  loaded: number;
  total: number;
}

export interface LabInitParams {
  runtime: LabRuntime;
  image: string | null;
  files: { name: string; data: ArrayBuffer }[];
  packages: string[];
  services: string[];
  timeoutSeconds: number;
  /** Linux: linhas de shell como root antes do terminal abrir, e o usuario em que ele entra. */
  setup?: string[];
  user?: string | null;
}

export interface LabRunResult {
  output: string;
  exitCode: number;
  /** Passou do tempo e o laboratorio derrubou o programa (exit 124). */
  timedOut: boolean;
  /** O aluno mandou parar (exit 130). */
  aborted: boolean;
  ms: number;
}

interface Reply {
  id?: number;
  event?: string;
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Fase 87: ponte entre o app e o laboratorio de codigo. O codigo do aluno roda em Workers dentro da pagina
 * `/lab/runner.html` (public/lab/), num iframe escondido; aqui so ha o protocolo de mensagens (ver o
 * cabecalho de public/lab/runner.mjs). O iframe NAO usa `sandbox`: o isolamento vem da CSP de /lab/
 * (connect-src so em /lab/), entao o codigo do aluno nao alcanca a API da Focada nem outra origem.
 */
export class LabClient {
  private frame: HTMLIFrameElement | null;
  private nextId = 1;
  private readonly waiters = new Map<number, (reply: Reply) => void>();
  private readonly loaded: Promise<void>;
  private readonly onMessage: (e: MessageEvent) => void;
  onProgress: ((progress: LabProgress) => void) | null = null;
  /** O runtime caiu (timeout/parar) e esta subindo de novo, ou voltou. */
  onStatus: ((status: 'restarting' | 'ready') => void) | null = null;

  constructor() {
    const frame = document.createElement('iframe');
    frame.src = '/lab/runner.html';
    frame.title = 'Laboratório de código';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none';
    this.frame = frame;

    let resolveLoaded: () => void;
    this.loaded = new Promise((resolve) => {
      resolveLoaded = resolve;
    });
    this.onMessage = (e: MessageEvent) => {
      if (!this.frame || e.source !== this.frame.contentWindow) return;
      const reply = e.data as Reply;
      if (reply.event === 'loaded') resolveLoaded();
      else if (reply.event === 'progress') this.onProgress?.(reply as unknown as LabProgress);
      else if (reply.event === 'status') this.onStatus?.(reply.status as 'restarting' | 'ready');
      else if (reply.id !== undefined) {
        this.waiters.get(reply.id)?.(reply);
        this.waiters.delete(reply.id);
      }
    };
    window.addEventListener('message', this.onMessage);
    document.body.appendChild(frame);
  }

  private async call(type: string, payload: Record<string, unknown> = {}): Promise<Reply> {
    await this.loaded;
    const frame = this.frame;
    if (!frame?.contentWindow) throw new Error('O laboratório foi fechado.');
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.waiters.set(id, resolve);
      frame.contentWindow!.postMessage({ id, type, ...payload }, '*');
    });
  }

  async init(params: LabInitParams): Promise<void> {
    const reply = await this.call('init', { ...params });
    if (!reply.ok) throw new Error(reply.error ?? 'O laboratório não conseguiu iniciar.');
  }

  async run(script: string, argv: string[], entry: string): Promise<LabRunResult> {
    return this.result(await this.call('run', { script, argv, entry }));
  }

  /** Linux: roda um comando no terminal da VM. */
  async exec(command: string): Promise<LabRunResult> {
    return this.result(await this.call('exec', { command }));
  }

  /** Linux: grava um arquivo na VM (o que o aluno editou). */
  async write(path: string, text: string): Promise<void> {
    const reply = await this.call('write', { path, text });
    if (!reply.ok) throw new Error(reply.error ?? 'Não consegui gravar o arquivo no laboratório.');
  }

  /** Derruba o que estiver rodando; o runtime sobe de novo no proximo comando. */
  async abort(): Promise<void> {
    await this.call('abort');
  }

  dispose() {
    window.removeEventListener('message', this.onMessage);
    this.frame?.remove();
    this.frame = null;
    this.waiters.clear();
  }

  private result(reply: Reply): LabRunResult {
    if (!reply.ok) throw new Error(reply.error ?? 'O laboratório não respondeu.');
    return {
      output: String(reply.output ?? ''),
      exitCode: Number(reply.exitCode ?? 0),
      timedOut: Boolean(reply.timedOut),
      aborted: Boolean(reply.aborted),
      ms: Number(reply.ms ?? 0),
    };
  }
}
