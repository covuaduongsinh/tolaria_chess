import { describe, expect, it } from 'vitest'
import { CHESS_TYPE_NAMES, planChessTypeSeeds } from './chessTypeSeeds'

describe('planChessTypeSeeds', () => {
  it('seeds all four chess types when none exist yet', () => {
    const seeds = planChessTypeSeeds([])
    expect(seeds.map((seed) => seed.name)).toEqual(CHESS_TYPE_NAMES)
  })

  it('writes a type document with metadata and an H1', () => {
    const game = planChessTypeSeeds([]).find((seed) => seed.name === 'Chess Game')
    expect(game?.content).toContain('type: Type')
    expect(game?.content).toContain('icon:')
    expect(game?.content).toContain('color:')
    expect(game?.content).toContain('sort: chess_date:desc')
    expect(game?.content).toContain('# Chess Game')
  })

  it('skips types that already exist (case-insensitive)', () => {
    const seeds = planChessTypeSeeds(['chess game', 'Chess Player'])
    expect(seeds.map((seed) => seed.name)).toEqual(['Chess Opening', 'Chess Event'])
  })
})
