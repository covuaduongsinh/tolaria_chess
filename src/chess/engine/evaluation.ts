// Pure helpers that turn a raw engine score (always reported from the side-to-move's
// perspective) into White-relative numbers for display and the eval bar.

import type { ChessColor } from '../types'
import type { EngineScore } from './uci'

/** Flip the score so positive always means "good for White". */
export function normalizeScoreToWhite(score: EngineScore, turn: ChessColor): EngineScore {
  if (turn === 'white') return score
  return { type: score.type, value: -score.value }
}

/** Human-readable score from White's perspective: `+0.24`, `-1.50`, `M3`, `-M2`. */
export function formatScore(whiteScore: EngineScore): string {
  if (whiteScore.type === 'mate') {
    const sign = whiteScore.value < 0 ? '-' : ''
    return `${sign}M${Math.abs(whiteScore.value)}`
  }
  const pawns = whiteScore.value / 100
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`
}

const EVAL_BAR_CLAMP = 0.98

/** White's share of the eval bar in [0,1]. Centipawns pass through a logistic
 *  curve; a forced mate pins the bar to (almost) one end. */
export function evalBarWhiteFraction(whiteScore: EngineScore): number {
  if (whiteScore.type === 'mate') {
    return whiteScore.value > 0 ? EVAL_BAR_CLAMP : 1 - EVAL_BAR_CLAMP
  }
  const logistic = 1 / (1 + Math.exp(-whiteScore.value / 350))
  return clamp(logistic, 1 - EVAL_BAR_CLAMP, EVAL_BAR_CLAMP)
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  return value > max ? max : value
}
