// Builds the on-disk representation of an imported game: a "Chess Game" note whose
// frontmatter carries the searchable metadata and whose body embeds a ```chess board.
// Pure (no filesystem); the import hook owns path uniqueness and the actual write.

import type { ChessGameImport } from './pgnImport'
import { chessFenceSource } from '../utils/chessMarkdown'

const FRONTMATTER_FIELDS: ReadonlyArray<readonly [keyof ChessGameImport['headers'], string]> = [
  ['white', 'chess_white'],
  ['black', 'chess_black'],
  ['result', 'chess_result'],
  ['event', 'chess_event'],
  ['date', 'chess_date'],
  ['eco', 'chess_eco'],
]

function yamlString(value: string): string {
  return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`
}

function frontmatterLines(game: ChessGameImport): string[] {
  const lines = ['type: Chess Game']
  for (const [key, yamlKey] of FRONTMATTER_FIELDS) {
    const value = game.headers[key]
    if (value) lines.push(`${yamlKey}: ${yamlString(value)}`)
  }
  return lines
}

/** Full note content: YAML frontmatter, an H1 title, and an embedded chess board. */
export function buildChessGameNoteContent(game: ChessGameImport): string {
  const frontmatter = `---\n${frontmatterLines(game).join('\n')}\n---`
  const board = chessFenceSource({ pgn: game.movetext, orientation: 'white' })
  return `${frontmatter}\n\n# ${game.title}\n\n${board}\n`
}

/** Filesystem-safe base name (no extension) derived from the game's title. */
export function chessGameBaseName(game: ChessGameImport): string {
  const cleaned = game.title
    .replace(/[\\/:*?"<>|]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return cleaned || 'Chess game'
}
