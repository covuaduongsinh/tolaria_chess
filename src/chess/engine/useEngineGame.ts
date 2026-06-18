import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EngineClient, type EngineWorkerFactory } from './engineClient'
import { uciMoveSquares } from './uci'
import { fenAtPly, parseGame, playMove, positionStatus } from '../chessCore'
import type { ChessColor, ChessPositionStatus } from '../types'

export interface EngineGame {
  pgn: string
  playerColor: ChessColor
  /** True while it is the engine's move (it is searching for a reply). */
  thinking: boolean
  status: ChessPositionStatus
  /** Apply the human player's move (the new PGN from the board). */
  onPlayerMove: (pgn: string) => void
  /** Switch sides; also starts a fresh game. */
  setPlayerColor: (color: ChessColor) => void
  reset: () => void
}

function promotionOf(move: string): string | undefined {
  return move.length > 4 ? move[4] : undefined
}

/** Drives a game against Stockfish: the human moves their colour on the board and
 *  this hook plays the engine's reply whenever it is the engine's turn. */
export function useEngineGame(input: {
  depth: number
  createWorker?: EngineWorkerFactory
}): EngineGame {
  const { depth, createWorker } = input
  const [pgn, setPgn] = useState('')
  const [playerColor, setPlayerColor] = useState<ChessColor>('white')
  const engineRef = useRef<EngineClient | null>(null)

  const position = useMemo(() => parseGame(pgn), [pgn])
  const ply = position.moves.length
  const fen = fenAtPly(position, ply)
  const status = useMemo(() => positionStatus(fen), [fen])
  const engineTurn = !status.isGameOver && status.turn !== playerColor

  useEffect(() => {
    if (!engineTurn) return undefined

    const client = engineRef.current ?? new EngineClient(createWorker)
    engineRef.current = client
    let active = true

    void client
      .analyze({ fen, depth })
      .then((result) => {
        if (!active || !result.bestMove) return
        const squares = uciMoveSquares(result.bestMove)
        if (!squares) return
        const next = playMove({ pgn, ply, from: squares.from, to: squares.to, promotion: promotionOf(result.bestMove) })
        if (next) setPgn(next.pgn)
      })
      .catch(() => undefined)

    return () => {
      active = false
      client.stop()
    }
  }, [engineTurn, fen, depth, pgn, ply, createWorker])

  useEffect(() => () => {
    engineRef.current?.dispose()
    engineRef.current = null
  }, [])

  const onPlayerMove = useCallback((nextPgn: string) => setPgn(nextPgn), [])
  const reset = useCallback(() => setPgn(''), [])
  const changePlayerColor = useCallback((color: ChessColor) => {
    setPlayerColor(color)
    setPgn('')
  }, [])

  return { pgn, playerColor, thinking: engineTurn, status, onPlayerMove, setPlayerColor: changePlayerColor, reset }
}
