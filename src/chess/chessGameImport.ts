// Turns pasted/loaded PGN into a set of note writes. Pure planning plus a runner
// that takes an injected `createNote`, so the whole flow is testable without Tauri.

import { parseImportedGames, splitPgnGames } from './pgnImport'
import { buildChessGameNoteContent, chessGameBaseName } from './chessGameNote'

export interface ChessGameNotePlan {
  path: string
  content: string
}

export interface ChessImportPlan {
  notes: ChessGameNotePlan[]
  failed: number
}

export interface ChessImportResult {
  imported: number
  failed: number
}

function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base.toLowerCase())) {
    taken.add(base.toLowerCase())
    return base
  }
  let ordinal = 2
  while (taken.has(`${base} (${ordinal})`.toLowerCase())) ordinal += 1
  const name = `${base} (${ordinal})`
  taken.add(name.toLowerCase())
  return name
}

function joinVaultPath(vaultPath: string, filename: string): string {
  const separator = vaultPath.includes('\\') ? '\\' : '/'
  const trimmed = vaultPath.replace(/[\\/]+$/u, '')
  return `${trimmed}${separator}${filename}.md`
}

/** Build the note writes for every valid game, giving each a collision-free name. */
export function planChessGameImports(input: {
  pgn: string
  vaultPath: string
  existingFilenames: readonly string[]
}): ChessImportPlan {
  const games = parseImportedGames(input.pgn)
  const failed = splitPgnGames(input.pgn).length - games.length
  const taken = new Set(input.existingFilenames.map((name) => name.toLowerCase()))

  const notes = games.map((game) => ({
    path: joinVaultPath(input.vaultPath, uniqueName(chessGameBaseName(game), taken)),
    content: buildChessGameNoteContent(game),
  }))
  return { notes, failed }
}

/** Plan then write each game; a failed write counts toward `failed` rather than throwing. */
export async function runChessGameImport(input: {
  pgn: string
  vaultPath: string
  existingFilenames: readonly string[]
  createNote: (note: ChessGameNotePlan) => Promise<void>
}): Promise<ChessImportResult> {
  const plan = planChessGameImports(input)
  let imported = 0
  for (const note of plan.notes) {
    try {
      await input.createNote(note)
      imported += 1
    } catch {
      // Skip a single failed write (e.g. name race) and keep importing the rest.
    }
  }
  return { imported, failed: plan.failed + (plan.notes.length - imported) }
}
