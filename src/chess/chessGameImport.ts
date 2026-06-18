// Turns pasted/loaded PGN into a set of note writes that join the knowledge graph:
// the chess type documents, one stub note per distinct player/opening/event, and the
// game notes themselves (linked to those entities via wikilink relationships). Pure
// planning plus a runner that takes an injected `createNote`, so the whole flow is
// testable without Tauri. Writes are ordered types → entities → games so a game's
// relationship targets exist before the game references them.

import { parseImportedGames, splitPgnGames } from './pgnImport'
import { buildChessGameNoteContent, chessGameBaseName } from './chessGameNote'
import { buildChessEntityNoteContent, planChessEntities, type KnownNote } from './chessEntities'
import { planChessTypeSeeds } from './chessTypeSeeds'

export type ChessNoteKind = 'type' | 'entity' | 'game'

export interface ChessGameNotePlan {
  path: string
  content: string
  kind: ChessNoteKind
}

export interface ChessImportPlan {
  notes: ChessGameNotePlan[]
  failed: number
  /** Number of game notes in `notes` (the rest are type/entity infrastructure). */
  gameCount: number
}

export interface ChessImportResult {
  imported: number
  failed: number
  entitiesCreated: number
  typesCreated: number
}

export interface ChessImportPlanInput {
  pgn: string
  vaultPath: string
  /** Existing vault notes, for entity reuse and filename collision avoidance. */
  existingNotes: readonly KnownNote[]
  /** Titles of existing `type: Type` documents, so chess types are seeded once. */
  existingTypeTitles: readonly string[]
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

/** Build the ordered note writes (types → entities → games) for an import batch. */
export function planChessGameImports(input: ChessImportPlanInput): ChessImportPlan {
  const games = parseImportedGames(input.pgn)
  const failed = splitPgnGames(input.pgn).length - games.length

  const entityPlan = planChessEntities(games, input.existingNotes)
  const typeSeeds = planChessTypeSeeds(input.existingTypeTitles)
  const taken = new Set(input.existingNotes.map((note) => note.stem.toLowerCase()))

  const typeNotes: ChessGameNotePlan[] = typeSeeds.map((seed) => ({
    kind: 'type',
    path: joinVaultPath(input.vaultPath, uniqueName(seed.name, taken)),
    content: seed.content,
  }))

  // Entity filenames are the wikilink targets, so they are never disambiguated; a
  // same-named existing note was already reused upstream. Reserve them so games skip them.
  const entityNotes: ChessGameNotePlan[] = entityPlan.entities.map((entity) => {
    taken.add(entity.target.toLowerCase())
    return {
      kind: 'entity',
      path: joinVaultPath(input.vaultPath, entity.target),
      content: buildChessEntityNoteContent(entity),
    }
  })

  const gameNotes: ChessGameNotePlan[] = games.map((game, index) => ({
    kind: 'game',
    path: joinVaultPath(input.vaultPath, uniqueName(chessGameBaseName(game), taken)),
    content: buildChessGameNoteContent(game, entityPlan.links[index]),
  }))

  return { notes: [...typeNotes, ...entityNotes, ...gameNotes], failed, gameCount: gameNotes.length }
}

export interface ChessImportRunInput extends ChessImportPlanInput {
  createNote: (note: ChessGameNotePlan) => Promise<void>
}

/** Plan then write each note; a failed write is skipped so the rest still import. */
export async function runChessGameImport(input: ChessImportRunInput): Promise<ChessImportResult> {
  const plan = planChessGameImports(input)
  let imported = 0
  let entitiesCreated = 0
  let typesCreated = 0
  for (const note of plan.notes) {
    try {
      await input.createNote(note)
      if (note.kind === 'game') imported += 1
      else if (note.kind === 'entity') entitiesCreated += 1
      else typesCreated += 1
    } catch {
      // Skip a single failed write (e.g. name race or pre-existing file) and continue.
    }
  }
  return {
    imported,
    failed: plan.failed + (plan.gameCount - imported),
    entitiesCreated,
    typesCreated,
  }
}
