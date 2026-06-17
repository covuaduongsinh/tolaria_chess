// Pure wrappers around chess.js. Everything here is DOM-free and synchronous so it
// can be unit-tested directly and reused by the editor block, the game library, and
// the play/train surfaces. No chessground or React concerns leak in.

import { Chess, DEFAULT_POSITION, type Color, type Square } from 'chess.js'
import type {
  ChessColor,
  ChessGamePosition,
  ChessMove,
  ChessPositionStatus,
  ChessSquare,
} from './types'

export const STARTING_FEN = DEFAULT_POSITION

const PROMOTION_PIECES = new Set(['q', 'r', 'b', 'n'])

export interface PlayMoveInput {
  pgn: string
  ply: number
  from: ChessSquare
  to: ChessSquare
  promotion?: string
}

export interface PlayMoveResult {
  pgn: string
  san: string
}

export function toChessColor(color: Color): ChessColor {
  return color === 'w' ? 'white' : 'black'
}

function isBlank(pgn: string): boolean {
  return pgn.trim().length === 0
}

function loadPgnSafely(pgn: string): Chess | null {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn)
    return chess
  } catch {
    return null
  }
}

function loadFenSafely(fen: string): Chess | null {
  try {
    return new Chess(fen)
  } catch {
    return null
  }
}

function emptyGame(): ChessGamePosition {
  return { startingFen: STARTING_FEN, moves: [] }
}

/** Parse a PGN into a starting position plus the resolved move list. Invalid or
 *  empty PGN yields a fresh starting position rather than throwing. */
export function parseGame(pgn: string): ChessGamePosition {
  if (isBlank(pgn)) return emptyGame()

  const chess = loadPgnSafely(pgn)
  if (!chess) return emptyGame()

  const history = chess.history({ verbose: true })
  const startingFen = history.length > 0 ? history[0].before : chess.fen()
  const moves: ChessMove[] = history.map(move => ({
    san: move.san,
    from: move.from,
    to: move.to,
    fenAfter: move.after,
  }))
  return { startingFen, moves }
}

function clampPly(ply: number, length: number): number {
  if (ply < 0) return 0
  return ply > length ? length : ply
}

/** FEN of the board after `ply` half-moves (ply 0 = the starting position). */
export function fenAtPly(position: ChessGamePosition, ply: number): string {
  const limit = clampPly(ply, position.moves.length)
  if (limit === 0) return position.startingFen
  return position.moves[limit - 1].fenAfter
}

/** The from/to squares of the move that produced the position at `ply`, for
 *  last-move highlighting. Undefined at the starting position. */
export function lastMoveAtPly(
  position: ChessGamePosition,
  ply: number,
): [ChessSquare, ChessSquare] | undefined {
  const limit = clampPly(ply, position.moves.length)
  if (limit === 0) return undefined
  const move = position.moves[limit - 1]
  return [move.from, move.to]
}

function appendDestination(dests: Map<ChessSquare, ChessSquare[]>, from: ChessSquare, to: ChessSquare): void {
  const existing = dests.get(from)
  if (existing) {
    existing.push(to)
    return
  }
  dests.set(from, [to])
}

/** Legal destinations grouped by origin square, in the Map shape chessground wants. */
export function legalDestinations(fen: string): Map<ChessSquare, ChessSquare[]> {
  const dests = new Map<ChessSquare, ChessSquare[]>()
  const chess = loadFenSafely(fen)
  if (!chess) return dests

  for (const move of chess.moves({ verbose: true })) {
    appendDestination(dests, move.from, move.to)
  }
  return dests
}

function defaultStatus(): ChessPositionStatus {
  return {
    turn: 'white',
    isGameOver: false,
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    isStalemate: false,
  }
}

export function positionStatus(fen: string): ChessPositionStatus {
  const chess = loadFenSafely(fen)
  if (!chess) return defaultStatus()

  return {
    turn: toChessColor(chess.turn()),
    isGameOver: chess.isGameOver(),
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
  }
}

function reachesPromotionRank(color: Color, to: ChessSquare): boolean {
  const rank = to.slice(-1)
  return color === 'w' ? rank === '8' : rank === '1'
}

function normalizePromotion(requested?: string): string {
  return requested && PROMOTION_PIECES.has(requested) ? requested : 'q'
}

function resolvePromotion(chess: Chess, from: ChessSquare, to: ChessSquare, requested?: string): string | undefined {
  const piece = chess.get(from as Square)
  if (!piece || piece.type !== 'p') return undefined
  if (!reachesPromotionRank(piece.color, to)) return undefined
  return normalizePromotion(requested)
}

function replaySan(chess: Chess, san: string): boolean {
  try {
    chess.move(san)
    return true
  } catch {
    return false
  }
}

function buildPositionAtPly(startingFen: string, moves: ChessMove[], ply: number): Chess | null {
  const chess = loadFenSafely(startingFen)
  if (!chess) return null

  const limit = clampPly(ply, moves.length)
  for (let index = 0; index < limit; index += 1) {
    if (!replaySan(chess, moves[index].san)) return null
  }
  return chess
}

function applyMove(chess: Chess, from: ChessSquare, to: ChessSquare, promotion?: string): PlayMoveResult | null {
  const resolvedPromotion = resolvePromotion(chess, from, to, promotion)
  try {
    const move = chess.move({ from, to, promotion: resolvedPromotion })
    return { pgn: chess.pgn(), san: move.san }
  } catch {
    return null
  }
}

/** Play a move from the position at `ply`, truncating any later moves (so playing
 *  from an earlier position starts a fresh line). Returns null for illegal moves. */
export function playMove(input: PlayMoveInput): PlayMoveResult | null {
  const { startingFen, moves } = parseGame(input.pgn)
  const chess = buildPositionAtPly(startingFen, moves, input.ply)
  if (!chess) return null
  return applyMove(chess, input.from, input.to, input.promotion)
}
