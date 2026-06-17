import { describe, expect, it } from 'vitest'
import { parseBestMove, parseEngineLine, parseInfoLine, uciMoveSquares } from './uci'

describe('parseInfoLine', () => {
  it('parses depth, score and principal variation', () => {
    const info = parseInfoLine('info depth 18 seldepth 24 multipv 1 score cp 37 nodes 100 nps 9 time 5 pv e2e4 e7e5 g1f3')
    expect(info).toEqual({
      depth: 18,
      multipv: 1,
      score: { type: 'cp', value: 37 },
      pv: ['e2e4', 'e7e5', 'g1f3'],
    })
  })

  it('parses a mate score', () => {
    expect(parseInfoLine('info depth 12 score mate -3 pv a1a2')?.score).toEqual({ type: 'mate', value: -3 })
  })

  it('defaults multipv to 1 and pv to empty', () => {
    const info = parseInfoLine('info depth 4 score cp -8')
    expect(info?.multipv).toBe(1)
    expect(info?.pv).toEqual([])
  })

  it('ignores progress lines without a score', () => {
    expect(parseInfoLine('info depth 1 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfoLine('info string NNUE evaluation using ...')).toBeNull()
    expect(parseInfoLine('readyok')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('reads the best move and ignores the ponder move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
  })

  it('returns null when there is no move', () => {
    expect(parseBestMove('bestmove (none)')).toBeNull()
    expect(parseBestMove('info depth 1')).toBeNull()
  })
})

describe('parseEngineLine', () => {
  it('classifies info, bestmove and other lines', () => {
    expect(parseEngineLine('info depth 5 score cp 10 pv d2d4').kind).toBe('info')
    expect(parseEngineLine('bestmove d2d4')).toEqual({ kind: 'bestmove', move: 'd2d4' })
    expect(parseEngineLine('uciok').kind).toBe('other')
  })
})

describe('uciMoveSquares', () => {
  it('splits a move into squares, tolerating a promotion suffix', () => {
    expect(uciMoveSquares('e2e4')).toEqual({ from: 'e2', to: 'e4' })
    expect(uciMoveSquares('e7e8q')).toEqual({ from: 'e7', to: 'e8' })
  })

  it('rejects malformed moves', () => {
    expect(uciMoveSquares('0000')).toBeNull()
    expect(uciMoveSquares('xyz')).toBeNull()
  })
})
