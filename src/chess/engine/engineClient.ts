// Wraps a Stockfish Web Worker and speaks UCI. The worker is injected through a
// factory so unit tests can drive a fake engine; production uses the vendored
// single-threaded WASM build under /public/engine.

import { parseEngineLine, type EngineInfo } from './uci'

export interface EngineWorker {
  postMessage: (command: string) => void
  addEventListener: (type: 'message', listener: (event: { data: string }) => void) => void
  terminate: () => void
}

export type EngineWorkerFactory = () => EngineWorker

export interface AnalysisRequest {
  fen: string
  depth: number
  onInfo?: (info: EngineInfo) => void
}

export interface AnalysisResult {
  bestMove: string | null
  info: EngineInfo | null
}

const ENGINE_WORKER_URL = '/engine/stockfish.wasm.js'

function createStockfishWorker(): EngineWorker {
  const worker = new Worker(ENGINE_WORKER_URL)
  return {
    postMessage: (command) => worker.postMessage(command),
    addEventListener: (_type, listener) =>
      worker.addEventListener('message', (event: MessageEvent) => listener({ data: String(event.data) })),
    terminate: () => worker.terminate(),
  }
}

type LineListener = (line: string) => void

export class EngineClient {
  private worker: EngineWorker | null = null
  private ready = false
  private readonly listeners = new Set<LineListener>()
  private readonly createWorker: EngineWorkerFactory

  constructor(createWorker: EngineWorkerFactory = createStockfishWorker) {
    this.createWorker = createWorker
  }

  async init(): Promise<void> {
    if (this.ready) return

    const worker = this.createWorker()
    this.worker = worker
    worker.addEventListener('message', (event) => this.emit(event.data))
    worker.postMessage('uci')
    await this.waitForLine((line) => line === 'uciok')
    worker.postMessage('isready')
    await this.waitForLine((line) => line === 'readyok')
    this.ready = true
  }

  /** Analyze a position to the given depth. Any in-flight search is stopped and
   *  drained first, so the resolved result belongs to this request. */
  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    await this.init()
    const worker = this.worker
    if (!worker) return { bestMove: null, info: null }

    await this.drain(worker)
    return this.runSearch(worker, request)
  }

  stop(): void {
    this.worker?.postMessage('stop')
  }

  dispose(): void {
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    this.listeners.clear()
  }

  private emit(line: string): void {
    for (const listener of [...this.listeners]) listener(line)
  }

  private waitForLine(predicate: (line: string) => boolean): Promise<void> {
    return new Promise((resolve) => {
      const listener: LineListener = (line) => {
        if (!predicate(line)) return
        this.listeners.delete(listener)
        resolve()
      }
      this.listeners.add(listener)
    })
  }

  // Stop the current search and wait for `readyok`, which flushes the stopped
  // search's trailing `bestmove` so it cannot leak into the next result.
  private async drain(worker: EngineWorker): Promise<void> {
    worker.postMessage('stop')
    worker.postMessage('isready')
    await this.waitForLine((line) => line === 'readyok')
  }

  private runSearch(worker: EngineWorker, request: AnalysisRequest): Promise<AnalysisResult> {
    return new Promise((resolve) => {
      let latest: EngineInfo | null = null
      const listener: LineListener = (line) => {
        const message = parseEngineLine(line)
        if (message.kind === 'info') {
          latest = message.info
          request.onInfo?.(message.info)
          return
        }
        if (message.kind === 'bestmove') {
          this.listeners.delete(listener)
          resolve({ bestMove: message.move, info: latest })
        }
      }
      this.listeners.add(listener)
      worker.postMessage(`position fen ${request.fen}`)
      worker.postMessage(`go depth ${request.depth}`)
    })
  }
}
