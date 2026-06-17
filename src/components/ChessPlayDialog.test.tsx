import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChessPlayDialog } from './ChessPlayDialog'
import type { EngineWorker, EngineWorkerFactory } from '../chess/engine/engineClient'

const chessgroundMock = vi.hoisted(() => {
  const api = { set: vi.fn(), destroy: vi.fn(), toggleOrientation: vi.fn() }
  return { api, Chessground: vi.fn(() => api) }
})

vi.mock('chessground', () => ({ Chessground: chessgroundMock.Chessground }))
vi.mock('chessground/assets/chessground.base.css', () => ({}))
vi.mock('chessground/assets/chessground.brown.css', () => ({}))
vi.mock('chessground/assets/chessground.cburnett.css', () => ({}))

function fakeFactory(bestmove: string): EngineWorkerFactory {
  return () => {
    let listener: ((event: { data: string }) => void) | null = null
    const worker: EngineWorker = {
      postMessage(command) {
        queueMicrotask(() => {
          if (command === 'uci') listener?.({ data: 'uciok' })
          else if (command === 'isready') listener?.({ data: 'readyok' })
          else if (command.startsWith('go')) {
            listener?.({ data: `info depth 6 score cp 10 pv ${bestmove}` })
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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ChessPlayDialog', () => {
  it('shows the title and that it is the human player\'s turn', () => {
    render(<ChessPlayDialog open onOpenChange={() => {}} createWorker={fakeFactory('e7e5')} />)
    expect(screen.getByText('Play vs computer')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Your turn')
  })

  it('lets the engine make the opening move when you play Black', async () => {
    render(<ChessPlayDialog open onOpenChange={() => {}} createWorker={fakeFactory('e2e4')} />)
    fireEvent.click(screen.getByRole('button', { name: 'Play as Black' }))
    await waitFor(() => expect(screen.getByText('e4')).toBeInTheDocument())
  })

  it('offers difficulty levels', () => {
    render(<ChessPlayDialog open onOpenChange={() => {}} createWorker={fakeFactory('e7e5')} />)
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hard' }))
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('data-variant', 'secondary')
  })
})
