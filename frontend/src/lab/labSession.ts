import type { CuratedContentDto, LabConfigDto } from '../api/types';
import { LabClient, type LabProgress, type LabRunResult } from './labClient';

export type LabStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';

/** Foto imutavel do laboratorio, pro React (useSyncExternalStore) - um objeto novo a cada mudanca. */
export interface LabSnapshot {
  status: LabStatus;
  progress: LabProgress | null;
  error: string | null;
  /** O runtime caiu (timeout/parar) e esta subindo de novo. */
  restarting: boolean;
  /** Linux: o diretorio atual do terminal (o `cd` do aluno vale entre comandos e entre os passos do dia). */
  cwd: string | null;
}

const IDLE: LabSnapshot = { status: 'idle', progress: null, error: null, restarting: false, cwd: null };

/** Nome do arquivo no ambiente: o ultimo trecho do endereco do File ("/ponte/.../ponte.pcap" -> "ponte.pcap"). */
function fileName(content: CuratedContentDto): string {
  return (content.externalUrl ?? content.title).split('/').pop() ?? content.title;
}

/**
 * Fase 87: o laboratorio de UM dia, vivo durante a sessao (a `TodayPage` cria um e o derruba ao sair). O
 * ambiente persiste entre os passos do mesmo dia e zera no dia seguinte (decisao 17 do rascunho) - por isso
 * o runtime nao pode viver dentro do componente do passo, que e remontado a cada etapa.
 *
 * `ensure` e idempotente: a mesma configuracao (runtime, imagem, arquivos, pacotes) reaproveita o runtime
 * que ja esta no ar; outra configuracao derruba o anterior. Reutilizavel depois de `dispose` (StrictMode).
 */
export class LabSession {
  private client: LabClient | null = null;
  private key: string | null = null;
  private starting: Promise<void> | null = null;
  private current: LabSnapshot = IDLE;
  private readonly listeners = new Set<() => void>();

  getSnapshot = (): LabSnapshot => this.current;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<LabSnapshot>) {
    this.current = { ...this.current, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** Sobe o laboratorio do dia (baixa o runtime na 1a vez) e resolve quando esta pronto. */
  ensure(lab: LabConfigDto, contents: CuratedContentDto[]): Promise<void> {
    const files = lab.fileContentIds
      .map((id) => contents.find((c) => c.id === id))
      .filter((c): c is CuratedContentDto => c !== undefined && c.externalUrl !== null);
    const key = JSON.stringify([lab.runtime, lab.image, lab.packages, lab.services, lab.timeoutSeconds, lab.setup, lab.user, files.map((f) => f.externalUrl)]);
    if (this.client && this.key === key && this.starting) return this.starting;

    this.teardown();
    this.key = key;
    const client = new LabClient();
    this.client = client;
    this.set({ status: 'loading', progress: null, error: null, restarting: false, cwd: null });
    // O download manda um evento por pedaco (centenas por segundo): junta e atualiza a tela no maximo a cada 100 ms,
    // senao o React estoura o limite de atualizacoes aninhadas.
    let latest: LabProgress | null = null;
    let scheduled = false;
    client.onProgress = (progress) => {
      latest = progress;
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        if (latest && this.client === client && this.current.status === 'loading') this.set({ progress: latest });
      }, 100);
    };
    // Reiniciar recria o shell, que volta pro home.
    client.onStatus = (status) => this.set(status === 'restarting' ? { restarting: true, cwd: null } : { restarting: false });

    this.starting = (async () => {
      const buffers = await Promise.all(
        files.map(async (f) => {
          const response = await fetch(f.externalUrl!);
          if (!response.ok) throw new Error(`Não consegui baixar ${fileName(f)}.`);
          return { name: fileName(f), data: await response.arrayBuffer() };
        }),
      );
      await client.init({
        runtime: lab.runtime,
        image: lab.image,
        files: buffers,
        packages: lab.packages,
        services: lab.services,
        timeoutSeconds: lab.timeoutSeconds,
        setup: lab.setup,
        user: lab.user,
      });
    })().then(
      () => {
        if (this.client === client) this.set({ status: 'ready', progress: null });
      },
      (err: unknown) => {
        if (this.client === client) this.set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
        throw err;
      },
    );
    // Quem chama trata o erro; aqui so evita "unhandled rejection" quando ninguem esta esperando.
    this.starting.catch(() => undefined);
    return this.starting;
  }

  private async guarded<T>(work: (client: LabClient) => Promise<T>): Promise<T> {
    const client = this.client;
    if (!client) throw new Error('O laboratório ainda não foi iniciado.');
    await this.starting;
    this.set({ status: 'running' });
    try {
      return await work(client);
    } finally {
      if (this.client === client) this.set({ status: 'ready' });
    }
  }

  run(script: string, argv: string[], entry: string): Promise<LabRunResult> {
    return this.guarded((c) => c.run(script, argv, entry));
  }

  async exec(command: string): Promise<LabRunResult> {
    const result = await this.guarded((c) => c.exec(command));
    if (result.cwd !== null && result.cwd !== this.current.cwd) this.set({ cwd: result.cwd });
    return result;
  }

  write(path: string, text: string): Promise<void> {
    return this.guarded((c) => c.write(path, text));
  }

  /** "Parar": derruba o programa; o runtime sobe de novo sozinho. */
  async abort(): Promise<void> {
    await this.client?.abort();
  }

  /** Volta ao zero (o laboratorio nao subiu e o aluno quer tentar de novo): o proximo `ensure` recria tudo. */
  reset() {
    this.teardown();
    this.current = IDLE;
    for (const listener of this.listeners) listener();
  }

  private teardown() {
    this.client?.dispose();
    this.client = null;
    this.starting = null;
    this.key = null;
  }

  dispose() {
    this.teardown();
    this.current = IDLE;
    for (const listener of this.listeners) listener();
  }
}
