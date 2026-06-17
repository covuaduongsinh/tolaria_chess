import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEngineAnalysis } from './useEngineAnalysis'
import type { EngineWorker, EngineWorkerFactory } from './engineClient'

const START_WHITE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const START_BLACK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'

function fakeWorkerFactory(): EngineWorkerFactory {
  return () => {
    let listener: ((event: { data: string }) => void) | null = null
    const worker: EngineWorker = {
      postMessage(command) {
        queueMicrotask(() => {
          if (command === 'uci') listener?.({ data: 'uciok' })
          else if (command === 'isready') listener?.({ data: 'readyok' })
          else if (command.startsWith('go')) {
            listener?.({ data: 'info depth 12 score cp 40 pv e2e4 e7e5' })
            listener?.({ data: 'bestmove e2e4' })
          }
        })
      },
      addEventListener(_type, registered) {
        listener = registered
      },
      terminate() {},
    }
    return worker
  }
}

describe('useEngineAnalysis', () => {
  it('stays idle while disabled', () => {
    const factory = fakeWorkerFactory()
    const { result } = renderHook(() => useEngineAnalysis(START_WHITE, false, 12, factory))
    expect(result.current.loading).toBe(false)
    expect(result.current.whiteScore).toBeNull()
  })

  it('produces a White-relative evaluation when enabled', async () => {
    const factory = fakeWorkerFactory()
    const { result } = renderHook(() => useEngineAnalysis(START_WHITE, true, 12, factory))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.whiteScore).toEqual({ type: 'cp', value: 40 })
    expect(result.current.bestMove).toBe('e2e4')
    expect(result.current.depth).toBe(12)
  })

  it('flips the score for a black-to-move position', async () => {
    const factory = fakeWorkerFactory()
    const { result } = renderHook(() => useEngineAnalysis(START_BLACK, true, 12, factory))

    await waitFor(() => expect(result.current.whiteScore).not.toBeNull())
    expect(result.current.whiteScore).toEqual({ type: 'cp', value: -40 })
  })
})
