import { describe, expect, it, vi } from 'vitest'
import { planChessGameImports, runChessGameImport, type ChessGameNotePlan } from './chessGameImport'

const TWO_GAMES = [
  '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
  '[White "Alice"]\n[Black "Bob"]\n[Result "0-1"]\n\n1. d4 d5 0-1',
].join('\n\n')

describe('planChessGameImports', () => {
  it('creates one note plan per valid game with content and a path', () => {
    const plan = planChessGameImports({ pgn: TWO_GAMES, vaultPath: '/vault', existingFilenames: [] })
    expect(plan.notes).toHaveLength(2)
    expect(plan.failed).toBe(0)
    expect(plan.notes[0].path).toBe('/vault/Alice vs Bob.md')
    expect(plan.notes[0].content).toContain('type: Chess Game')
  })

  it('disambiguates colliding names against existing and within the batch', () => {
    const plan = planChessGameImports({
      pgn: TWO_GAMES,
      vaultPath: '/vault',
      existingFilenames: ['Alice vs Bob'],
    })
    expect(plan.notes.map((note) => note.path)).toEqual([
      '/vault/Alice vs Bob (2).md',
      '/vault/Alice vs Bob (3).md',
    ])
  })

  it('uses a Windows separator for Windows vault paths', () => {
    const plan = planChessGameImports({ pgn: TWO_GAMES, vaultPath: 'C:\\Vault', existingFilenames: [] })
    expect(plan.notes[0].path).toBe('C:\\Vault\\Alice vs Bob.md')
  })

  it('counts unparseable games as failed', () => {
    const plan = planChessGameImports({ pgn: '[Event "Empty"]', vaultPath: '/v', existingFilenames: [] })
    expect(plan.notes).toHaveLength(0)
    expect(plan.failed).toBe(1)
  })
})

describe('runChessGameImport', () => {
  it('writes every note and reports the imported count', async () => {
    const written: ChessGameNotePlan[] = []
    const result = await runChessGameImport({
      pgn: TWO_GAMES,
      vaultPath: '/vault',
      existingFilenames: [],
      createNote: async (note) => { written.push(note) },
    })
    expect(result).toEqual({ imported: 2, failed: 0 })
    expect(written).toHaveLength(2)
  })

  it('keeps importing when one write fails and reports it', async () => {
    const createNote = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('name race'))
    const result = await runChessGameImport({
      pgn: TWO_GAMES,
      vaultPath: '/vault',
      existingFilenames: [],
      createNote,
    })
    expect(result).toEqual({ imported: 1, failed: 1 })
  })
})
