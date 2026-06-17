import { describe, expect, it } from 'vitest'
import { EngineClient, type EngineWorker } from './engineClient'
import type { EngineInfo } from './uci'

class FakeStockfishWorker implements EngineWorker {
  public readonly commands: string[] = []
  public terminated = false
  private listener: ((event: { data: string }) => void) | null = null

  postMessage(command: string): void {
    this.commands.push(command)
    queueMicrotask(() => this.respond(command))
  }

  addEventListener(_type: 'message', listener: (event: { data: string }) => void): void {
    this.listener = listener
  }

  terminate(): void {
    this.terminated = true
  }

  private send(data: string): void {
    this.listener?.({ data })
  }

  private respond(command: string): void {
    if (command === 'uci') this.send('uciok')
    else if (command === 'isready') this.send('readyok')
    else if (command.startsWith('go')) {
      this.send('info depth 6 score cp 12 pv d2d4')
      this.send('info depth 14 score cp 31 pv e2e4 e7e5 g1f3')
      this.send('bestmove e2e4 ponder e7e5')
    }
  }
}

describe('EngineClient', () => {
  it('handshakes, analyzes, and resolves with the best move and deepest info', async () => {
    const worker = new FakeStockfishWorker()
    const client = new EngineClient(() => worker)
    const infos: EngineInfo[] = []

    const result = await client.analyze({ fen: 'startpos-fen', depth: 14, onInfo: (info) => infos.push(info) })

    expect(result.bestMove).toBe('e2e4')
    expect(result.info?.depth).toBe(14)
    expect(result.info?.score).toEqual({ type: 'cp', value: 31 })
    expect(infos).toHaveLength(2)
  })

  it('issues UCI commands in order, draining before searching', async () => {
    const worker = new FakeStockfishWorker()
    const client = new EngineClient(() => worker)

    await client.analyze({ fen: 'fen-1', depth: 10 })

    expect(worker.commands).toEqual([
      'uci',
      'isready',
      'stop',
      'isready',
      'position fen fen-1',
      'go depth 10',
    ])
  })

  it('reuses a single worker across analyses and only handshakes once', async () => {
    const worker = new FakeStockfishWorker()
    const client = new EngineClient(() => worker)

    await client.analyze({ fen: 'fen-1', depth: 8 })
    await client.analyze({ fen: 'fen-2', depth: 8 })

    expect(worker.commands.filter((command) => command === 'uci')).toHaveLength(1)
    expect(worker.commands).toContain('position fen fen-2')
  })

  it('terminates the worker on dispose', async () => {
    const worker = new FakeStockfishWorker()
    const client = new EngineClient(() => worker)
    await client.analyze({ fen: 'fen-1', depth: 8 })

    client.dispose()
    expect(worker.terminated).toBe(true)
  })
})
