import { describe, expect, it } from 'vitest'
import { buildChessGameNoteContent, chessGameBaseName, sanitizeNoteBaseName, type ChessGameLinks } from './chessGameNote'
import type { ChessGameImport } from './pgnImport'

const game: ChessGameImport = {
  title: 'Alice vs Bob (2024.01.05)',
  headers: {
    white: 'Alice',
    black: 'Bob',
    result: '1-0',
    event: 'World Championship',
    date: '2024.01.05',
    eco: 'C50',
    opening: 'Italian Game',
  },
  movetext: '1. e4 e5 2. Nf3 Nc6 1-0',
}

const links: ChessGameLinks = {
  white: 'Alice',
  black: 'Bob',
  event: 'World Championship',
  opening: 'C50 Italian Game',
}

describe('buildChessGameNoteContent', () => {
  it('links players/opening/event as wikilink relationships and keeps scalar fields', () => {
    const content = buildChessGameNoteContent(game, links)
    expect(content).toContain('type: Chess Game')
    expect(content).toContain('chess_white: "[[Alice]]"')
    expect(content).toContain('chess_event: "[[World Championship]]"')
    expect(content).toContain('chess_opening: "[[C50 Italian Game]]"')
    expect(content).toContain('chess_result: "1-0"')
    expect(content).toContain('chess_eco: "C50"')
    expect(content).toContain('# Alice vs Bob (2024.01.05)')
    expect(content).toContain('```chess\n1. e4 e5 2. Nf3 Nc6 1-0\n```')
  })

  it('omits relationship and scalar fields that have no value', () => {
    const sparse: ChessGameImport = {
      title: 'Chess game',
      headers: { white: '', black: '', result: '*', event: '', date: '', eco: '', opening: '' },
      movetext: '1. e4',
    }
    const content = buildChessGameNoteContent(sparse, { white: null, black: null, event: null, opening: null })
    expect(content).not.toContain('chess_white')
    expect(content).not.toContain('chess_opening')
    expect(content).toContain('chess_result: "*"')
  })

  it('escapes quotes inside a wikilink target', () => {
    const content = buildChessGameNoteContent(game, { ...links, event: 'The "Big" Open' })
    expect(content).toContain('chess_event: "[[The \\"Big\\" Open]]"')
  })
})

describe('chessGameBaseName / sanitizeNoteBaseName', () => {
  it('strips characters that are illegal in filenames', () => {
    expect(chessGameBaseName({ ...game, title: 'A/B: c*d?' })).toBe('A B c d')
    expect(sanitizeNoteBaseName('A/B: c*d?')).toBe('A B c d')
  })

  it('falls back when the game title is empty after cleaning', () => {
    expect(chessGameBaseName({ ...game, title: '///' })).toBe('Chess game')
  })
})
