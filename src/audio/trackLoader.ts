/**
 * Renders music loops one at a time (offline rendering is CPU-heavy, so never in parallel)
 * and keeps every finished loop. Explicit requests jump the queue; `prefetch` fills the rest
 * in the background so zone changes cross-fade instantly.
 * The renderer is injected, so the scheduling logic is testable without Web Audio.
 */

export type RenderTrack<Id, Buffer> = (id: Id) => Promise<Buffer | null>;

interface Entry<Buffer> {
  readonly promise: Promise<Buffer | null>;
  readonly resolve: (buffer: Buffer | null) => void;
  state: 'queued' | 'rendering' | 'done';
}

export class TrackLoader<Id, Buffer> {
  private readonly render: RenderTrack<Id, Buffer>;
  private readonly onError: (id: Id, error: unknown) => void;
  private readonly entries = new Map<Id, Entry<Buffer>>();
  private readonly queue: Id[] = [];
  private busy = false;

  constructor(render: RenderTrack<Id, Buffer>, onError: (id: Id, error: unknown) => void) {
    this.render = render;
    this.onError = onError;
  }

  /** Resolves with the rendered loop (null if it cannot be rendered); renders it next if needed. */
  load(id: Id): Promise<Buffer | null> {
    const entry = this.entry(id);
    if (entry.state === 'queued') {
      this.dequeue(id);
      this.queue.unshift(id);
      this.pump();
    }
    return entry.promise;
  }

  /** Queues every id not rendered yet, behind any explicit requests. */
  prefetch(ids: readonly Id[]): void {
    for (const id of ids) {
      if (this.entries.has(id)) continue;
      this.entry(id);
      this.queue.push(id);
    }
    this.pump();
  }

  /** True once `id` has finished rendering (successfully or not). */
  isReady(id: Id): boolean {
    return this.entries.get(id)?.state === 'done';
  }

  private entry(id: Id): Entry<Buffer> {
    const existing = this.entries.get(id);
    if (existing) return existing;
    let resolve: (buffer: Buffer | null) => void = () => undefined;
    const promise = new Promise<Buffer | null>((done) => {
      resolve = done;
    });
    const created: Entry<Buffer> = { promise, resolve, state: 'queued' };
    this.entries.set(id, created);
    return created;
  }

  private dequeue(id: Id): void {
    const index = this.queue.indexOf(id);
    if (index !== -1) this.queue.splice(index, 1);
  }

  private pump(): void {
    if (this.busy) return;
    const id = this.queue.shift();
    if (id === undefined) return;
    const entry = this.entry(id);
    entry.state = 'rendering';
    this.busy = true;
    const finish = (buffer: Buffer | null): void => {
      entry.state = 'done';
      entry.resolve(buffer);
      this.busy = false;
      this.pump();
    };
    let rendering: Promise<Buffer | null>;
    try {
      rendering = this.render(id);
    } catch (error) {
      rendering = Promise.reject(error);
    }
    rendering.then(finish, (error: unknown) => {
      this.onError(id, error);
      finish(null);
    });
  }
}
