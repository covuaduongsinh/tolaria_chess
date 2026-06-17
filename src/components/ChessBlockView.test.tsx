import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChessBlockView } from './ChessBlockView'
import type { ChessBoardProps } from '../chess/ChessBoard'
import type { ChessPositionStatus } from '../chess/types'

const captured: { props?: ChessBoardProps } = {}

vi.mock('../chess/ChessBoard', () => ({
  ChessBoard: (props: ChessBoardProps) => {
    captured.props = props
    return <div data-testid="board">{props.describeStatus?.(whiteToMove)}</div>
  },
}))

const whiteToMove: ChessPositionStatus = {
  turn: 'white',
  isGameOver: false,
  isCheck: false,
  isCheckmate: false,
  isDraw: false,
  isStalemate: false,
}

afterEach(() => {
  cleanup()
  captured.props = undefined
})

describe('ChessBlockView', () => {
  it('maps the stored orientation and localizes labels and status', () => {
    render(<ChessBlockView pgn="1. e4" orientation="black" onPgnChange={() => {}} onOrientationChange={() => {}} />)
    expect(captured.props?.orientation).toBe('black')
    expect(captured.props?.labels.flipBoard).toBe('Flip board')
    expect(screen.getByTestId('board')).toHaveTextContent('White to move')
  })

  it('normalizes an unknown orientation to white', () => {
    render(<ChessBlockView pgn="" orientation="sideways" onPgnChange={() => {}} onOrientationChange={() => {}} />)
    expect(captured.props?.orientation).toBe('white')
  })

  it('forwards the PGN change callback to the board', () => {
    const onPgnChange = vi.fn()
    render(<ChessBlockView pgn="" orientation="white" onPgnChange={onPgnChange} onOrientationChange={() => {}} />)
    captured.props?.onPgnChange?.('1. d4')
    expect(onPgnChange).toHaveBeenCalledWith('1. d4')
  })
})
