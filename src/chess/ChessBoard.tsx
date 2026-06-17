import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import type { DrawShape } from 'chessground/draw'
import type { Dests, Key } from 'chessground/types'
import {
  ArrowsClockwise,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretLeft,
  CaretRight,
  Cpu,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  fenAtPly,
  lastMoveAtPly,
  legalDestinations,
  parseGame,
  playMove,
  positionStatus,
} from './chessCore'
import { usePlyNavigation } from './usePlyNavigation'
import { useEngineAnalysis } from './engine/useEngineAnalysis'
import { evalBarWhiteFraction, formatScore } from './engine/evaluation'
import { uciMoveSquares } from './engine/uci'
import type { ChessColor, ChessGamePosition, ChessPositionStatus } from './types'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'
import './ChessBoard.css'

const ANALYSIS_DEPTH = 16

/** aria-labels for the controls, supplied (and localized) by the caller. */
export interface ChessBoardLabels {
  flipBoard: string
  firstMove: string
  previousMove: string
  nextMove: string
  lastMove: string
  analyze: string
}

interface MoveArrow {
  from: string
  to: string
}

export interface ChessBoardProps {
  pgn: string
  orientation?: ChessColor
  /** When false the pieces cannot be dragged (read-only viewer). Defaults to true. */
  interactive?: boolean
  /** Restrict the user to moving only this colour (e.g. when playing the engine). */
  playableColor?: ChessColor
  labels: ChessBoardLabels
  /** Optional localized status line (whose turn / checkmate / draw). */
  describeStatus?: (status: ChessPositionStatus) => string
  onPgnChange?: (pgn: string) => void
  onOrientationChange?: (orientation: ChessColor) => void
  onAnalyzeToggle?: (enabled: boolean) => void
}

// chess.js squares and chessground keys share the `e2` shape, but the structural
// Map types are not assignable; narrow at this single boundary.
function toDests(map: Map<string, string[]>): Dests {
  return map as unknown as Dests
}

function arrowShapes(arrow: MoveArrow | null): DrawShape[] {
  if (!arrow) return []
  return [{ orig: arrow.from as Key, dest: arrow.to as Key, brush: 'green' }]
}

interface BoardConfigInput {
  position: ChessGamePosition
  ply: number
  orientation: ChessColor
  canMove: boolean
  arrow: MoveArrow | null
  onMove: (orig: Key, dest: Key) => void
}

function buildBoardConfig({ position, ply, orientation, canMove, arrow, onMove }: BoardConfigInput): Config {
  const fen = fenAtPly(position, ply)
  const status = positionStatus(fen)
  const lastMove = lastMoveAtPly(position, ply)
  return {
    fen,
    orientation,
    turnColor: status.turn,
    check: status.isCheck ? status.turn : undefined,
    lastMove: lastMove ? (lastMove as Key[]) : undefined,
    coordinates: true,
    movable: {
      free: false,
      color: canMove ? status.turn : undefined,
      dests: canMove ? toDests(legalDestinations(fen)) : new Map(),
      showDests: true,
      events: { after: onMove },
    },
    drawable: { enabled: true, autoShapes: arrowShapes(arrow) },
    animation: { enabled: true, duration: 180 },
  }
}

export function ChessBoard({
  pgn,
  orientation = 'white',
  interactive = true,
  playableColor,
  labels,
  describeStatus,
  onPgnChange,
  onOrientationChange,
  onAnalyzeToggle,
}: ChessBoardProps) {
  const position = useMemo(() => parseGame(pgn), [pgn])
  const moveCount = position.moves.length
  const { ply, isLive, goLive, goTo, first, previous, next } = usePlyNavigation(moveCount)
  const [boardOrientation, setBoardOrientation] = useState<ChessColor>(orientation)
  const [analyzing, setAnalyzing] = useState(false)

  const boardRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<Api | null>(null)

  const fen = fenAtPly(position, ply)
  const status = positionStatus(fen)
  const canMove = interactive && isLive && !status.isGameOver
    && (playableColor === undefined || status.turn === playableColor)

  const analysis = useEngineAnalysis(fen, analyzing, ANALYSIS_DEPTH)
  const arrow = useMemo<MoveArrow | null>(
    () => (analyzing && analysis.bestMove ? uciMoveSquares(analysis.bestMove) : null),
    [analyzing, analysis.bestMove],
  )

  const handleMove = useCallback((orig: Key, dest: Key) => {
    const result = playMove({ pgn, ply, from: orig, to: dest })
    if (!result) return
    onPgnChange?.(result.pgn)
    goLive()
  }, [pgn, ply, onPgnChange, goLive])

  // Create the chessground instance once; only refs/imports are referenced.
  useEffect(() => {
    const element = boardRef.current
    if (!element) return undefined
    apiRef.current = Chessground(element, {})
    return () => {
      apiRef.current?.destroy()
      apiRef.current = null
    }
  }, [])

  useEffect(() => {
    apiRef.current?.set(buildBoardConfig({ position, ply, orientation: boardOrientation, canMove, arrow, onMove: handleMove }))
  }, [position, ply, boardOrientation, canMove, arrow, handleMove])

  const flip = () => {
    const nextOrientation = boardOrientation === 'white' ? 'black' : 'white'
    setBoardOrientation(nextOrientation)
    onOrientationChange?.(nextOrientation)
  }

  const toggleAnalysis = () => {
    const nextAnalyzing = !analyzing
    setAnalyzing(nextAnalyzing)
    onAnalyzeToggle?.(nextAnalyzing)
  }

  const whitePercent = analysis.whiteScore ? evalBarWhiteFraction(analysis.whiteScore) * 100 : 50
  const evalLabel = analysis.whiteScore ? formatScore(analysis.whiteScore) : '…'

  return (
    <div className="tolaria-chess" data-testid="chess-board">
      <div className="tolaria-chess__board-row">
        {analyzing ? (
          <div className="tolaria-chess__evalbar" aria-hidden>
            <div className="tolaria-chess__evalbar-white" style={{ height: `${whitePercent}%` }} />
          </div>
        ) : null}
        <div ref={boardRef} className="tolaria-chess__board" />
      </div>
      <div className="tolaria-chess__controls">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.firstMove} disabled={ply === 0} onClick={first}>
          <CaretDoubleLeft />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.previousMove} disabled={ply === 0} onClick={previous}>
          <CaretLeft />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.nextMove} disabled={isLive} onClick={next}>
          <CaretRight />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.lastMove} disabled={isLive} onClick={goLive}>
          <CaretDoubleRight />
        </Button>
        <span className="tolaria-chess__spacer" />
        {analyzing ? <span className="tolaria-chess__eval" data-testid="chess-eval">{evalLabel}</span> : null}
        <Button
          type="button"
          variant={analyzing ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label={labels.analyze}
          aria-pressed={analyzing}
          onClick={toggleAnalysis}
        >
          <Cpu />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.flipBoard} onClick={flip}>
          <ArrowsClockwise />
        </Button>
      </div>
      {describeStatus ? <div className="tolaria-chess__status">{describeStatus(status)}</div> : null}
      <ol className="tolaria-chess__moves">
        {position.moves.map((move, index) => (
          <li key={`${index}-${move.san}`}>
            {index % 2 === 0 ? <span className="tolaria-chess__move-number">{index / 2 + 1}.</span> : null}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={cn('tolaria-chess__move', { 'is-current': index + 1 === ply })}
              onClick={() => goTo(index + 1)}
            >
              {move.san}
            </Button>
          </li>
        ))}
      </ol>
    </div>
  )
}
