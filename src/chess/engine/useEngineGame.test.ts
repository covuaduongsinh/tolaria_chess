import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEngineGame } from './useEngineGame'
import type { EngineWorker, EngineWorkerFactory } from './engineClient'

function fakeFactory(bestmove: string): EngineWorkerFactory {
  return () => {
    let listener: ((event: { data: string }) => void) | null = null
    const worker: EngineWorker = {
      postMessage(command) {
        queueMicrotask(() => {
          if (command === 'uci') listener?.({ data: 'uciok' })
          else if (command === 'isready') listener?.({ data: 'readyok' })
          else if (command.startsWith('go')) {
            listener?.({ data: `info depth 8 score cp 15 pv ${bestmove}` })
            listener?.({ data: `bestmove ${bestmove}` })
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

describe('useEngineGame', () => {
  it('waits for the human when it is their move', () => {
    const { result } = renderHook(() => useEngineGame({ depth: 8, createWorker: fakeFactory('e7e5') }))
    expect(result.current.thinking).toBe(false)
    expect(result.current.pgn).toBe('')
  })

  it('plays the engine reply after the human moves', async () => {
    const { result } = renderHook(() => useEngineGame({ depth: 8, createWorker: fakeFactory('e7e5') }))

    act(() => result.current.onPlayerMove('1. e4'))
    await waitFor(() => expect(result.current.pgn).toContain('e5'))
    expect(result.current.pgn).toContain('1. e4 e5')
    expect(result.current.thinking).toBe(false)
  })

  it('lets the engine open when the human plays Black', async () => {
    const { result } = renderHook(() => useEngineGame({ depth: 8, createWorker: fakeFactory('e2e4') }))

    act(() => result.current.setPlayerColor('black'))
    await waitFor(() => expect(result.current.pgn).toContain('e4'))
    expect(result.current.playerColor).toBe('black')
  })

  it('resets the game back to the starting position', async () => {
    const { result } = renderHook(() => useEngineGame({ depth: 8, createWorker: fakeFactory('e7e5') }))
    act(() => result.current.onPlayerMove('1. e4'))
    await waitFor(() => expect(result.current.pgn).toContain('e5'))

    act(() => result.current.reset())
    expect(result.current.pgn).toBe('')
  })
})
