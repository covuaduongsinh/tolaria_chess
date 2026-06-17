import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Config } from 'chessground/config'
import type { Key } from 'chessground/types'
import { ChessBoard, type ChessBoardLabels } from './ChessBoard'
import type { EngineAnalysis } from './engine/useEngineAnalysis'

const chessgroundMock = vi.hoisted(() => {
  const api = { set: vi.fn(), destroy: vi.fn(), toggleOrientation: vi.fn() }
  return { api, Chessground: vi.fn(() => api) }
})

const engineMock = vi.hoisted(() => ({
  analysis: { whiteScore: null, bestMove: null, depth: 0, loading: false } as EngineAnalysis,
}))

vi.mock('chessground', () => ({ Chessground: chessgroundMock.Chessground }))
vi.mock('chessground/assets/chessground.base.css', () => ({}))
vi.mock('chessground/assets/chessground.brown.css', () => ({}))
vi.mock('chessground/assets/chessground.cburnett.css', () => ({}))
vi.mock('./engine/useEngineAnalysis', () => ({
  useEngineAnalysis: () => engineMock.analysis,
}))

const labels: ChessBoardLabels = {
  flipBoard: 'Flip board',
  firstMove: 'First',
  previousMove: 'Previous',
  nextMove: 'Next',
  lastMove: 'Last',
  analyze: 'Analyze',
}

function latestConfig(): Config {
  const calls = chessgroundMock.api.set.mock.calls
  return calls[calls.length - 1][0] as Config
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  engineMock.analysis = { whiteScore: null, bestMove: null, depth: 0, loading: false }
})

describe('ChessBoard', () => {
  it('renders the move list and the localized status line', () => {
    render(<ChessBoard pgn="1. e4 e5 2. Nf3" labels={labels} describeStatus={() => 'Black to move'} />)
    expect(screen.getByText('e4')).toBeInTheDocument()
    expect(screen.getByText('Nf3')).toBeInTheDocument()
    expect(screen.getByText('Black to move')).toBeInTheDocument()
  })

  it('creates the board once and configures the live position', () => {
    render(<ChessBoard pgn="1. e4" labels={labels} />)
    expect(chessgroundMock.Chessground).toHaveBeenCalledTimes(1)
    expect(latestConfig().fen).toContain(' b ')
  })

  it('flips the board orientation', () => {
    const onOrientationChange = vi.fn()
    render(<ChessBoard pgn="" labels={labels} onOrientationChange={onOrientationChange} />)
    fireEvent.click(screen.getByLabelText('Flip board'))
    expect(onOrientationChange).toHaveBeenCalledWith('black')
    expect(latestConfig().orientation).toBe('black')
  })

  it('reports a played move as updated PGN', () => {
    const onPgnChange = vi.fn()
    render(<ChessBoard pgn="1. e4 e5 2. Nf3" labels={labels} onPgnChange={onPgnChange} />)
    const after = latestConfig().movable?.events?.after
    expect(after).toBeTypeOf('function')
    act(() => after?.('b8' as Key, 'c6' as Key, {} as never))
    expect(onPgnChange).toHaveBeenCalledTimes(1)
    expect(onPgnChange.mock.calls[0][0]).toContain('Nc6')
  })

  it('enables forward controls after stepping back through history', () => {
    render(<ChessBoard pgn="1. e4 e5" labels={labels} />)
    expect(screen.getByLabelText('Next')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Previous'))
    expect(screen.getByLabelText('Next')).not.toBeDisabled()
  })

  it('does not offer moves on a read-only board', () => {
    render(<ChessBoard pgn="1. e4" labels={labels} interactive={false} />)
    expect(latestConfig().movable?.color).toBeUndefined()
  })

  it('toggles engine analysis, drawing the best-move arrow and eval', () => {
    engineMock.analysis = { whiteScore: { type: 'cp', value: 50 }, bestMove: 'd2d4', depth: 16, loading: false }
    const onAnalyzeToggle = vi.fn()
    render(<ChessBoard pgn="1. e4 e5" labels={labels} onAnalyzeToggle={onAnalyzeToggle} />)

    fireEvent.click(screen.getByLabelText('Analyze'))
    expect(onAnalyzeToggle).toHaveBeenCalledWith(true)
    expect(screen.getByTestId('chess-eval')).toHaveTextContent('+0.50')
    expect(latestConfig().drawable?.autoShapes).toEqual([{ orig: 'd2', dest: 'd4', brush: 'green' }])
  })
})
