import { describe, expect, it } from 'vitest'
import { buildChessGameNoteContent, chessGameBaseName } from './chessGameNote'
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
  },
  movetext: '1. e4 e5 2. Nf3 Nc6 1-0',
}

describe('buildChessGameNoteContent', () => {
  it('writes typed frontmatter, an H1 and an embedded chess board', () => {
    const content = buildChessGameNoteContent(game)
    expect(content).toContain('type: Chess Game')
    expect(content).toContain('chess_white: "Alice"')
    expect(content).toContain('chess_result: "1-0"')
    expect(content).toContain('# Alice vs Bob (2024.01.05)')
    expect(content).toContain('```chess\n1. e4 e5 2. Nf3 Nc6 1-0\n```')
  })

  it('omits frontmatter fields that have no value', () => {
    const sparse: ChessGameImport = {
      title: 'Chess game',
      headers: { white: '', black: '', result: '*', event: '', date: '', eco: '' },
      movetext: '1. e4',
    }
    const content = buildChessGameNoteContent(sparse)
    expect(content).not.toContain('chess_white')
    expect(content).toContain('chess_result: "*"')
  })

  it('escapes quotes in header values', () => {
    const quoted = { ...game, headers: { ...game.headers, event: 'The "Big" Open' } }
    expect(buildChessGameNoteContent(quoted)).toContain('chess_event: "The \\"Big\\" Open"')
  })
})

describe('chessGameBaseName', () => {
  it('strips characters that are illegal in filenames', () => {
    expect(chessGameBaseName({ ...game, title: 'A/B: c*d?' })).toBe('A B c d')
  })

  it('falls back when the title is empty after cleaning', () => {
    expect(chessGameBaseName({ ...game, title: '///' })).toBe('Chess game')
  })
})
