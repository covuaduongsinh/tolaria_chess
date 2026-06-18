import { describe, expect, it } from 'vitest'
import { parseImportedGame, parseImportedGames, splitPgnGames } from './pgnImport'

const GAME_ONE = [
  '[Event "World Championship"]',
  '[White "Alice"]',
  '[Black "Bob"]',
  '[Date "2024.01.05"]',
  '[Result "1-0"]',
  '[ECO "C50"]',
  '',
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 1-0',
].join('\n')

const GAME_TWO = [
  '[Event "Rapid"]',
  '[White "Carol"]',
  '[Black "Dan"]',
  '[Result "0-1"]',
  '',
  '1. d4 d5 0-1',
].join('\n')

const GAME_WITH_OPENING = [
  '[Event "Tata Steel"]',
  '[White "Carlsen, Magnus"]',
  '[Black "Nakamura, Hikaru"]',
  '[Result "1-0"]',
  '[ECO "B90"]',
  '[Opening "Sicilian Defense"]',
  '[Variation "Najdorf Variation"]',
  '',
  '1. e4 c5 2. Nf3 d6 1-0',
].join('\n')

describe('splitPgnGames', () => {
  it('returns one game for a single-game PGN', () => {
    expect(splitPgnGames(GAME_ONE)).toHaveLength(1)
  })

  it('splits a multi-game PGN at game boundaries', () => {
    expect(splitPgnGames(`${GAME_ONE}\n\n${GAME_TWO}`)).toHaveLength(2)
  })

  it('returns nothing for blank input', () => {
    expect(splitPgnGames('   ')).toEqual([])
  })
})

describe('parseImportedGame', () => {
  it('extracts headers, a title and clean movetext', () => {
    const game = parseImportedGame(GAME_ONE)
    expect(game?.headers).toEqual({
      white: 'Alice',
      black: 'Bob',
      result: '1-0',
      event: 'World Championship',
      date: '2024.01.05',
      eco: 'C50',
      opening: '',
    })
    expect(game?.title).toBe('Alice vs Bob (2024.01.05)')
    expect(game?.movetext).toContain('1. e4 e5 2. Nf3 Nc6 3. Bc4')
    expect(game?.movetext).not.toContain('[')
  })

  it('combines the Opening and Variation tags into one opening header', () => {
    const game = parseImportedGame(GAME_WITH_OPENING)
    expect(game?.headers.opening).toBe('Sicilian Defense Najdorf Variation')
    expect(game?.headers.eco).toBe('B90')
  })

  it('falls back to a generic title for a headerless game', () => {
    const game = parseImportedGame('1. e4 e5 2. Nf3')
    expect(game?.title).toBe('Chess game')
    expect(game?.movetext).toContain('e4')
  })

  it('returns null for invalid PGN or an empty game', () => {
    expect(parseImportedGame('not a game at all ###')).toBeNull()
    expect(parseImportedGame('[Event "Empty"]')).toBeNull()
  })
})

describe('parseImportedGames', () => {
  it('parses every valid game in a multi-game file', () => {
    const games = parseImportedGames(`${GAME_ONE}\n\n${GAME_TWO}`)
    expect(games.map((game) => game.title)).toEqual([
      'Alice vs Bob (2024.01.05)',
      'Carol vs Dan',
    ])
  })
})
