// Builds the on-disk representation of an imported game: a "Chess Game" note whose
// frontmatter links players/opening/event as wikilink relationships (so games join
// the knowledge graph) and whose body embeds a ```chess board. Pure (no filesystem);
// the import planner owns entity resolution and path uniqueness.

import type { ChessGameImport, ChessGameHeaders } from './pgnImport'
import { chessFenceSource } from '../utils/chessMarkdown'
import { formatWikilinkRef } from '../utils/wikilink'

/** Wikilink targets (filename stems) for a game's related entities, or null when absent. */
export interface ChessGameLinks {
  white: string | null
  black: string | null
  opening: string | null
  event: string | null
}

// Wikilink relationship fields: any frontmatter value containing [[...]] is treated as a
// navigable relationship by the parser (ADR-0010), so these become backlinks for free.
const RELATIONSHIP_FIELDS: ReadonlyArray<readonly [keyof ChessGameLinks, string]> = [
  ['white', 'chess_white'],
  ['black', 'chess_black'],
  ['event', 'chess_event'],
  ['opening', 'chess_opening'],
]

// Plain scalar fields kept for filtering/grouping (not entities of their own).
const SCALAR_FIELDS: ReadonlyArray<readonly [keyof ChessGameHeaders, string]> = [
  ['result', 'chess_result'],
  ['date', 'chess_date'],
  ['eco', 'chess_eco'],
]

/** Quote and escape a string for a YAML scalar value. */
export function yamlQuote(value: string): string {
  return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`
}

function frontmatterLines(game: ChessGameImport, links: ChessGameLinks): string[] {
  const lines = ['type: Chess Game']
  for (const [key, yamlKey] of RELATIONSHIP_FIELDS) {
    const target = links[key]
    if (target) lines.push(`${yamlKey}: ${yamlQuote(formatWikilinkRef(target))}`)
  }
  for (const [key, yamlKey] of SCALAR_FIELDS) {
    const value = game.headers[key]
    if (value) lines.push(`${yamlKey}: ${yamlQuote(value)}`)
  }
  return lines
}

/** Full note content: YAML frontmatter, an H1 title, and an embedded chess board. */
export function buildChessGameNoteContent(game: ChessGameImport, links: ChessGameLinks): string {
  const frontmatter = `---\n${frontmatterLines(game, links).join('\n')}\n---`
  const board = chessFenceSource({ pgn: game.movetext, orientation: 'white' })
  return `${frontmatter}\n\n# ${game.title}\n\n${board}\n`
}

/** Strip characters that are illegal in filenames and collapse whitespace. */
export function sanitizeNoteBaseName(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

/** Filesystem-safe base name (no extension) derived from the game's title. */
export function chessGameBaseName(game: ChessGameImport): string {
  return sanitizeNoteBaseName(game.title) || 'Chess game'
}
