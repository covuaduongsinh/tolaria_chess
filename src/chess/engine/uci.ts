// Pure parsing of the UCI text protocol that Stockfish speaks. No worker or DOM
// concerns here so the protocol handling can be unit-tested directly.

export interface EngineScore {
  /** `cp` = centipawns, `mate` = mate in N (sign = which side). */
  type: 'cp' | 'mate'
  value: number
}

export interface EngineInfo {
  depth: number
  multipv: number
  score: EngineScore
  /** Principal variation as long-algebraic moves (e.g. `e2e4`). */
  pv: string[]
}

export type EngineMessage =
  | { kind: 'info'; info: EngineInfo }
  | { kind: 'bestmove'; move: string | null }
  | { kind: 'other' }

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/u)
}

function readNumberAfter(tokens: string[], key: string): number | undefined {
  const index = tokens.indexOf(key)
  if (index === -1) return undefined
  const value = Number.parseInt(tokens[index + 1] ?? '', 10)
  return Number.isNaN(value) ? undefined : value
}

function readScore(tokens: string[]): EngineScore | null {
  const index = tokens.indexOf('score')
  if (index === -1) return null

  const type = tokens[index + 1]
  const value = Number.parseInt(tokens[index + 2] ?? '', 10)
  if ((type !== 'cp' && type !== 'mate') || Number.isNaN(value)) return null
  return { type, value }
}

function readPrincipalVariation(tokens: string[]): string[] {
  const index = tokens.indexOf('pv')
  if (index === -1) return []
  return tokens.slice(index + 1)
}

/** Parse a `info ...` line into a usable evaluation, or null when it carries no
 *  score (e.g. `info depth 1 currmove ...` progress lines). */
export function parseInfoLine(line: string): EngineInfo | null {
  const tokens = tokenize(line)
  if (tokens[0] !== 'info') return null

  const score = readScore(tokens)
  const depth = readNumberAfter(tokens, 'depth')
  if (!score || depth === undefined) return null

  return {
    depth,
    multipv: readNumberAfter(tokens, 'multipv') ?? 1,
    score,
    pv: readPrincipalVariation(tokens),
  }
}

/** Parse a `bestmove e2e4 [ponder ...]` line. Returns null for `bestmove (none)`. */
export function parseBestMove(line: string): string | null {
  const tokens = tokenize(line)
  if (tokens[0] !== 'bestmove') return null
  const move = tokens[1]
  return !move || move === '(none)' ? null : move
}

export function parseEngineLine(line: string): EngineMessage {
  const info = parseInfoLine(line)
  if (info) return { kind: 'info', info }
  if (tokenize(line)[0] === 'bestmove') return { kind: 'bestmove', move: parseBestMove(line) }
  return { kind: 'other' }
}

/** Split a long-algebraic UCI move (`e2e4`, `e7e8q`) into its squares for the board. */
export function uciMoveSquares(move: string): { from: string; to: string } | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(move)) return null
  return { from: move.slice(0, 2), to: move.slice(2, 4) }
}
