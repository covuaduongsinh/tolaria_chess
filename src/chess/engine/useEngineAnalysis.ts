import { useEffect, useRef, useState } from 'react'
import { EngineClient, type EngineWorkerFactory } from './engineClient'
import { normalizeScoreToWhite } from './evaluation'
import type { EngineScore } from './uci'
import type { ChessColor } from '../types'

export interface EngineAnalysis {
  /** Evaluation from White's perspective, or null until the first result. */
  whiteScore: EngineScore | null
  /** Best move in long-algebraic UCI form (e.g. `e2e4`). */
  bestMove: string | null
  depth: number
  loading: boolean
}

interface EngineResult {
  fen: string
  whiteScore: EngineScore
  bestMove: string | null
  depth: number
}

function sideToMove(fen: string): ChessColor {
  return fen.split(/\s+/u)[1] === 'b' ? 'black' : 'white'
}

/** Runs Stockfish on `fen` while `enabled`, returning a live evaluation. Results
 *  are tagged with their FEN so a stale search never paints the wrong position;
 *  `loading` is derived during render rather than written from the effect. */
export function useEngineAnalysis(
  fen: string,
  enabled: boolean,
  depth: number,
  createWorker?: EngineWorkerFactory,
): EngineAnalysis {
  const [result, setResult] = useState<EngineResult | null>(null)
  const clientRef = useRef<EngineClient | null>(null)

  useEffect(() => {
    if (!enabled) return undefined

    const client = clientRef.current ?? new EngineClient(createWorker)
    clientRef.current = client
    let active = true
    const turn = sideToMove(fen)

    const publish = (score: EngineScore, bestMove: string | null, searchDepth: number) => {
      if (active) setResult({ fen, whiteScore: normalizeScoreToWhite(score, turn), bestMove, depth: searchDepth })
    }

    void client
      .analyze({ fen, depth, onInfo: (info) => publish(info.score, info.pv[0] ?? null, info.depth) })
      .then((search) => {
        if (search.info) publish(search.info.score, search.bestMove ?? search.info.pv[0] ?? null, search.info.depth)
      })
      .catch(() => undefined)

    return () => {
      active = false
      client.stop()
    }
  }, [fen, enabled, depth, createWorker])

  useEffect(() => () => {
    clientRef.current?.dispose()
    clientRef.current = null
  }, [])

  const current = result?.fen === fen ? result : null
  return {
    whiteScore: current?.whiteScore ?? null,
    bestMove: current?.bestMove ?? null,
    depth: current?.depth ?? 0,
    loading: enabled && current === null,
  }
}
