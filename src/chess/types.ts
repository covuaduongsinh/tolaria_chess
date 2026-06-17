// Shared chess domain types. `ChessColor` and `ChessSquare` deliberately use the
// chessground vocabulary ('white'/'black', 'e2') so the same values flow straight
// into the board renderer without translation.

export type ChessColor = 'white' | 'black'

/** Algebraic square such as `e2`. Compatible with both chess.js and chessground. */
export type ChessSquare = string

export interface ChessMove {
  san: string
  from: ChessSquare
  to: ChessSquare
  fenAfter: string
}

/** A fully resolved game: where it starts and every move that follows. */
export interface ChessGamePosition {
  startingFen: string
  moves: ChessMove[]
}

export interface ChessPositionStatus {
  turn: ChessColor
  isGameOver: boolean
  isCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  isStalemate: boolean
}
