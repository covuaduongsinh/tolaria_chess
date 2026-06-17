import { describe, expect, it } from 'vitest'
import {
  STARTING_FEN,
  fenAtPly,
  lastMoveAtPly,
  legalDestinations,
  parseGame,
  playMove,
  positionStatus,
  toChessColor,
} from './chessCore'

const SCHOLARS_MATE = '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#'

describe('parseGame', () => {
  it('returns the starting position for blank PGN', () => {
    expect(parseGame('')).toEqual({ startingFen: STARTING_FEN, moves: [] })
    expect(parseGame('   ')).toEqual({ startingFen: STARTING_FEN, moves: [] })
  })

  it('resolves moves with the FEN after each ply', () => {
    const { startingFen, moves } = parseGame('1. e4 e5 2. Nf3')
    expect(startingFen).toBe(STARTING_FEN)
    expect(moves.map(move => move.san)).toEqual(['e4', 'e5', 'Nf3'])
    expect(moves[0]).toMatchObject({ from: 'e2', to: 'e4' })
    expect(moves[2].fenAfter).toContain(' b ')
  })

  it('falls back to the starting position for invalid PGN', () => {
    expect(parseGame('this is not a game')).toEqual({ startingFen: STARTING_FEN, moves: [] })
  })
})

describe('fenAtPly / lastMoveAtPly', () => {
  const position = parseGame('1. e4 e5 2. Nf3')

  it('returns the starting FEN at ply 0 and clamps out-of-range plies', () => {
    expect(fenAtPly(position, 0)).toBe(STARTING_FEN)
    expect(fenAtPly(position, -5)).toBe(STARTING_FEN)
    expect(fenAtPly(position, 99)).toBe(position.moves[2].fenAfter)
  })

  it('reports the squares of the move that reached a ply', () => {
    expect(lastMoveAtPly(position, 0)).toBeUndefined()
    expect(lastMoveAtPly(position, 1)).toEqual(['e2', 'e4'])
    expect(lastMoveAtPly(position, 3)).toEqual(['g1', 'f3'])
  })
})

describe('legalDestinations', () => {
  it('groups legal targets by origin square', () => {
    const dests = legalDestinations(STARTING_FEN)
    expect(dests.get('e2')).toEqual(['e3', 'e4'])
    expect(dests.get('g1')).toEqual(['f3', 'h3'])
    // 8 pawns + 2 knights = 10 origin squares can move at the start.
    expect(dests.size).toBe(10)
  })

  it('returns an empty map for an invalid FEN', () => {
    expect(legalDestinations('not-a-fen').size).toBe(0)
  })
})

describe('playMove', () => {
  it('appends a legal move and returns updated PGN', () => {
    const result = playMove({ pgn: '1. e4', ply: 1, from: 'e7', to: 'e5' })
    expect(result?.san).toBe('e5')
    expect(result?.pgn).toContain('1. e4 e5')
  })

  it('rejects an illegal move', () => {
    expect(playMove({ pgn: '', ply: 0, from: 'e2', to: 'e5' })).toBeNull()
  })

  it('auto-queens a promotion by default', () => {
    const result = playMove({ pgn: '1. e4 d5 2. exd5 c6 3. dxc6 a6 4. cxb7 a5', ply: 8, from: 'b7', to: 'a8' })
    expect(result?.san).toBe('bxa8=Q')
  })

  it('honours an explicit underpromotion', () => {
    const result = playMove({
      pgn: '1. e4 d5 2. exd5 c6 3. dxc6 a6 4. cxb7 a5',
      ply: 8,
      from: 'b7',
      to: 'a8',
      promotion: 'n',
    })
    expect(result?.san).toBe('bxa8=N')
  })

  it('truncates later moves when playing from an earlier ply', () => {
    const result = playMove({ pgn: '1. e4 e5 2. Nf3 Nc6', ply: 1, from: 'c7', to: 'c5' })
    expect(result?.pgn).toContain('1. e4 c5')
    expect(result?.pgn).not.toContain('Nf3')
  })
})

describe('positionStatus / toChessColor', () => {
  it('maps chess.js colors to chessground colors', () => {
    expect(toChessColor('w')).toBe('white')
    expect(toChessColor('b')).toBe('black')
  })

  it('detects checkmate', () => {
    const { moves } = parseGame(SCHOLARS_MATE)
    const status = positionStatus(moves[moves.length - 1].fenAfter)
    expect(status.isCheckmate).toBe(true)
    expect(status.isGameOver).toBe(true)
  })

  it('reports a benign status for an invalid FEN', () => {
    expect(positionStatus('garbage')).toMatchObject({ isGameOver: false, turn: 'white' })
  })
})
