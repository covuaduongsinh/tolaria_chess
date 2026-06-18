import { describe, expect, it, vi } from 'vitest'
import { planChessGameImports, runChessGameImport, type ChessGameNotePlan } from './chessGameImport'
import { CHESS_TYPE_NAMES } from './chessTypeSeeds'
import type { KnownNote } from './chessEntities'

const TWO_GAMES = [
  '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 1-0',
  '[White "Alice"]\n[Black "Bob"]\n[Result "0-1"]\n\n1. d4 d5 0-1',
].join('\n\n')

const ALL_TYPES = CHESS_TYPE_NAMES
const ALICE_AND_BOB: KnownNote[] = [
  { stem: 'Alice', title: 'Alice', aliases: [] },
  { stem: 'Bob', title: 'Bob', aliases: [] },
]

function paths(notes: ChessGameNotePlan[], kind: ChessGameNotePlan['kind']): string[] {
  return notes.filter((note) => note.kind === kind).map((note) => note.path)
}

describe('planChessGameImports', () => {
  it('plans type docs, entity stubs, and linked game notes in dependency order', () => {
    const plan = planChessGameImports({
      pgn: TWO_GAMES, vaultPath: '/vault', existingNotes: [], existingTypeTitles: [],
    })
    expect(plan.gameCount).toBe(2)
    expect(plan.failed).toBe(0)
    expect(paths(plan.notes, 'type')).toHaveLength(4)
    expect(paths(plan.notes, 'entity')).toEqual(['/vault/Alice.md', '/vault/Bob.md'])
    expect(paths(plan.notes, 'game')).toEqual(['/vault/Alice vs Bob.md', '/vault/Alice vs Bob (2).md'])
    expect(plan.notes[0].kind).toBe('type')
    const firstGame = plan.notes.find((note) => note.kind === 'game')
    expect(firstGame?.content).toContain('type: Chess Game')
    expect(firstGame?.content).toContain('chess_white: "[[Alice]]"')
  })

  it('seeds nothing and reuses entities when types and players already exist', () => {
    const plan = planChessGameImports({
      pgn: TWO_GAMES, vaultPath: '/vault', existingNotes: ALICE_AND_BOB, existingTypeTitles: ALL_TYPES,
    })
    expect(paths(plan.notes, 'type')).toEqual([])
    expect(paths(plan.notes, 'entity')).toEqual([])
    expect(paths(plan.notes, 'game')).toHaveLength(2)
  })

  it('disambiguates colliding game names against existing notes and within the batch', () => {
    const plan = planChessGameImports({
      pgn: TWO_GAMES,
      vaultPath: '/vault',
      existingNotes: [...ALICE_AND_BOB, { stem: 'Alice vs Bob', title: 'Alice vs Bob', aliases: [] }],
      existingTypeTitles: ALL_TYPES,
    })
    expect(paths(plan.notes, 'game')).toEqual([
      '/vault/Alice vs Bob (2).md',
      '/vault/Alice vs Bob (3).md',
    ])
  })

  it('uses a Windows separator for Windows vault paths', () => {
    const plan = planChessGameImports({
      pgn: TWO_GAMES, vaultPath: 'C:\\Vault', existingNotes: ALICE_AND_BOB, existingTypeTitles: ALL_TYPES,
    })
    expect(paths(plan.notes, 'game')[0]).toBe('C:\\Vault\\Alice vs Bob.md')
  })

  it('counts unparseable games as failed without planning a game note', () => {
    const plan = planChessGameImports({
      pgn: '[Event "Empty"]', vaultPath: '/v', existingNotes: [], existingTypeTitles: ALL_TYPES,
    })
    expect(plan.gameCount).toBe(0)
    expect(plan.failed).toBe(1)
  })
})

describe('runChessGameImport', () => {
  it('writes every note and reports games, entities, and types separately', async () => {
    const written: ChessGameNotePlan[] = []
    const result = await runChessGameImport({
      pgn: TWO_GAMES,
      vaultPath: '/vault',
      existingNotes: [],
      existingTypeTitles: [],
      createNote: async (note) => { written.push(note) },
    })
    expect(result).toEqual({ imported: 2, failed: 0, entitiesCreated: 2, typesCreated: 4 })
    expect(written).toHaveLength(8)
  })

  it('keeps importing when a game write fails and counts it as failed', async () => {
    const createNote = vi.fn(async (note: ChessGameNotePlan) => {
      if (note.path.endsWith('Alice vs Bob (2).md')) throw new Error('name race')
    })
    const result = await runChessGameImport({
      pgn: TWO_GAMES,
      vaultPath: '/vault',
      existingNotes: ALICE_AND_BOB,
      existingTypeTitles: ALL_TYPES,
      createNote,
    })
    expect(result).toEqual({ imported: 1, failed: 1, entitiesCreated: 0, typesCreated: 0 })
  })
})
