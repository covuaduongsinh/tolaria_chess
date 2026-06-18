import { describe, expect, it } from 'vitest'
import type { ChessGameImport } from './pgnImport'
import {
  buildChessEntityNoteContent,
  buildOpeningTitle,
  normalizePlayerName,
  planChessEntities,
  type KnownNote,
} from './chessEntities'

function game(overrides: Partial<ChessGameImport['headers']>, title = 'Game'): ChessGameImport {
  return {
    title,
    headers: {
      white: '', black: '', result: '*', event: '', date: '', eco: '', opening: '',
      ...overrides,
    },
    movetext: '1. e4 e5',
  }
}

describe('normalizePlayerName', () => {
  it('swaps a single "Lastname, Firstname" into "Firstname Lastname"', () => {
    expect(normalizePlayerName('Carlsen, Magnus')).toBe('Magnus Carlsen')
  })

  it('leaves already-natural names untouched', () => {
    expect(normalizePlayerName('Magnus Carlsen')).toBe('Magnus Carlsen')
    expect(normalizePlayerName('Madonna')).toBe('Madonna')
  })

  it('does not reorder names with more than one comma', () => {
    expect(normalizePlayerName('a, b, c')).toBe('a, b, c')
  })
})

describe('buildOpeningTitle', () => {
  it('prefixes the opening name with the ECO code', () => {
    expect(buildOpeningTitle('B90', 'Sicilian Defense Najdorf Variation'))
      .toBe('B90 Sicilian Defense Najdorf Variation')
  })

  it('falls back to ECO-only or name-only, and null when both are empty', () => {
    expect(buildOpeningTitle('B90', '')).toBe('B90')
    expect(buildOpeningTitle('', 'Sicilian')).toBe('Sicilian')
    expect(buildOpeningTitle('', '')).toBeNull()
  })
})

describe('planChessEntities', () => {
  it('links each populated dimension and plans one stub per distinct entity', () => {
    const games = [game({ white: 'Alice', black: 'Bob', event: 'World Championship', eco: 'C50', opening: 'Italian Game' })]
    const plan = planChessEntities(games, [])

    expect(plan.links[0]).toEqual({
      white: 'Alice',
      black: 'Bob',
      opening: 'C50 Italian Game',
      event: 'World Championship',
    })
    expect(plan.entities.map((entity) => ({ type: entity.type, title: entity.title }))).toEqual([
      { type: 'Chess Player', title: 'Alice' },
      { type: 'Chess Player', title: 'Bob' },
      { type: 'Chess Opening', title: 'C50 Italian Game' },
      { type: 'Chess Event', title: 'World Championship' },
    ])
  })

  it('leaves links null and plans nothing for empty dimensions', () => {
    const plan = planChessEntities([game({})], [])
    expect(plan.links[0]).toEqual({ white: null, black: null, opening: null, event: null })
    expect(plan.entities).toEqual([])
  })

  it('de-duplicates a player shared across games into a single entity', () => {
    const games = [
      game({ white: 'Alice', black: 'Bob' }),
      game({ white: 'Alice', black: 'Carol' }),
    ]
    const plan = planChessEntities(games, [])
    const players = plan.entities.filter((entity) => entity.type === 'Chess Player').map((entity) => entity.title)
    expect(players).toEqual(['Alice', 'Bob', 'Carol'])
    expect(plan.links[0].white).toBe('Alice')
    expect(plan.links[1].white).toBe('Alice')
  })

  it('normalizes a "Lastname, Firstname" player and keeps the raw form as an alias', () => {
    const plan = planChessEntities([game({ white: 'Carlsen, Magnus' })], [])
    const player = plan.entities.find((entity) => entity.type === 'Chess Player')
    expect(player?.title).toBe('Magnus Carlsen')
    expect(player?.aliases).toContain('Carlsen, Magnus')
    expect(plan.links[0].white).toBe('Magnus Carlsen')
  })

  it('unifies openings that share an ECO code, aliasing the ECO', () => {
    const games = [
      game({ eco: 'B90', opening: 'Sicilian Najdorf' }),
      game({ eco: 'B90' }),
    ]
    const plan = planChessEntities(games, [])
    const openings = plan.entities.filter((entity) => entity.type === 'Chess Opening')
    expect(openings).toHaveLength(1)
    expect(openings[0].title).toBe('B90 Sicilian Najdorf')
    expect(openings[0].aliases).toContain('B90')
    expect(plan.links[0].opening).toBe('B90 Sicilian Najdorf')
    expect(plan.links[1].opening).toBe('B90 Sicilian Najdorf')
  })

  it('builds a typed entity note, quoting aliases that need it', () => {
    const content = buildChessEntityNoteContent({
      type: 'Chess Player', title: 'Magnus Carlsen', target: 'Magnus Carlsen', aliases: ['Carlsen, Magnus'],
    })
    expect(content).toContain('type: Chess Player')
    expect(content).toContain('aliases:\n  - "Carlsen, Magnus"')
    expect(content).toContain('# Magnus Carlsen')
  })

  it('omits the aliases block when there are none', () => {
    const content = buildChessEntityNoteContent({
      type: 'Chess Event', title: 'Tata Steel', target: 'Tata Steel', aliases: [],
    })
    expect(content).not.toContain('aliases')
    expect(content).toContain('# Tata Steel')
  })

  it('reuses an existing note (by alias) instead of creating a duplicate', () => {
    const existing: KnownNote[] = [
      { stem: 'magnus-carlsen', title: 'Magnus Carlsen', aliases: ['Carlsen, Magnus'] },
    ]
    const plan = planChessEntities([game({ white: 'Carlsen, Magnus' })], existing)
    expect(plan.entities).toEqual([])
    expect(plan.links[0].white).toBe('magnus-carlsen')
  })
})
