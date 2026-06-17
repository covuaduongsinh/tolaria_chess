import { useCallback, useState } from 'react'

export interface PlyNavigation {
  /** The resolved half-move currently shown (0 = starting position). */
  ply: number
  /** True when viewing the latest position (new moves are allowed here). */
  isLive: boolean
  goLive: () => void
  goTo: (ply: number) => void
  first: () => void
  previous: () => void
  next: () => void
}

/** Tracks which half-move (ply) is shown. A null review value means "follow the
 *  live end", so the displayed ply is derived from `moveCount` during render and
 *  stays correct as the game grows or shrinks — no clamping effect required. */
export function usePlyNavigation(moveCount: number): PlyNavigation {
  const [reviewPly, setReviewPly] = useState<number | null>(null)

  const ply = reviewPly === null ? moveCount : Math.min(reviewPly, moveCount)
  const isLive = ply === moveCount

  const goLive = useCallback(() => setReviewPly(null), [])
  const goTo = useCallback((target: number) => setReviewPly(Math.max(0, target)), [])
  const first = useCallback(() => setReviewPly(0), [])
  const previous = useCallback(() => setReviewPly(Math.max(0, ply - 1)), [ply])
  const next = useCallback(() => {
    const target = ply + 1
    setReviewPly(target >= moveCount ? null : target)
  }, [ply, moveCount])

  return { ply, isLive, goLive, goTo, first, previous, next }
}
