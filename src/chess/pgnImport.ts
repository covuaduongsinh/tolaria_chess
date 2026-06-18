// Pure conversion of PGN text into import specs for vault-native "Chess Game"
// notes. Reused by every import path (paste, .pgn upload, and later the
// Lichess/Chess.com fetch). No filesystem or note-creation concerns here.

import { Chess } from 'chess.js'

export interface ChessGameHeaders {
  white: string
  black: string
  result: string
  event: string
  date: string
  eco: string
  /** Opening name plus variation, combined from the `Opening`/`Variation` tags. */
  opening: string
}

export interface ChessGameImport {
  title: string
  headers: ChessGameHeaders
  /** Movetext only (no PGN tag pairs), suitable for a ```chess fence. */
  movetext: string
}

function headerValue(headers: Record<string, string>, key: string): string {
  const value = headers[key]
  // chess.js fills missing Seven-Tag-Roster fields with placeholders such as
  // `?` or `????.??.??`; treat any all-placeholder value as absent.
  if (!value || /^[?.]+$/u.test(value)) return ''
  return value
}

function readOpening(raw: Record<string, string>): string {
  return [headerValue(raw, 'Opening'), headerValue(raw, 'Variation')]
    .filter(Boolean)
    .join(' ')
}

function readHeaders(chess: Chess): ChessGameHeaders {
  const raw = chess.getHeaders()
  return {
    white: headerValue(raw, 'White'),
    black: headerValue(raw, 'Black'),
    result: headerValue(raw, 'Result') || '*',
    event: headerValue(raw, 'Event'),
    date: headerValue(raw, 'Date'),
    eco: headerValue(raw, 'ECO'),
    opening: readOpening(raw),
  }
}

function readMovetext(chess: Chess): string {
  return chess
    .pgn()
    .split('\n')
    .filter((line) => !line.startsWith('['))
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function buildTitle(headers: ChessGameHeaders): string {
  if (headers.white || headers.black) {
    const players = `${headers.white || '?'} vs ${headers.black || '?'}`
    return headers.date ? `${players} (${headers.date})` : players
  }
  return headers.event || 'Chess game'
}

/** Split a multi-game PGN file into individual game strings. */
export function splitPgnGames(pgn: string): string[] {
  const trimmed = pgn.trim()
  if (!trimmed) return []
  // Games are separated by a blank line before the next game's first tag pair
  // (`[Key "Value"]`). Movetext never starts a line with `[Key "`, so this only
  // matches real game boundaries, not the header/movetext gap within a game.
  return trimmed
    .split(/\n\s*\n(?=\s*\[[A-Za-z][\w]*\s+")/u)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Parse a single PGN game into an import spec, or null when it carries no moves. */
export function parseImportedGame(pgn: string): ChessGameImport | null {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
  } catch {
    return null
  }

  const headers = readHeaders(chess)
  const movetext = readMovetext(chess)
  if (chess.history().length === 0) return null
  return { title: buildTitle(headers), headers, movetext }
}

/** Parse a possibly multi-game PGN into import specs, skipping invalid games. */
export function parseImportedGames(pgn: string): ChessGameImport[] {
  return splitPgnGames(pgn)
    .map(parseImportedGame)
    .filter((game): game is ChessGameImport => game !== null)
}
