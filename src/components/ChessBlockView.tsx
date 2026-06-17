import { ChessBoard, type ChessBoardLabels } from '../chess/ChessBoard'
import type { ChessColor, ChessPositionStatus } from '../chess/types'
import { useDocumentLocale } from '../hooks/useDocumentLocale'
import { translate, type TranslationKey } from '../lib/i18n'
import { trackEvent } from '../lib/telemetry'

export interface ChessBlockViewProps {
  pgn: string
  orientation: string
  onPgnChange: (pgn: string) => void
  onOrientationChange: (orientation: ChessColor) => void
}

function toChessColor(orientation: string): ChessColor {
  return orientation === 'black' ? 'black' : 'white'
}

function chessStatusKey(status: ChessPositionStatus): TranslationKey {
  if (status.isCheckmate) return 'chess.status.checkmate'
  if (status.isStalemate) return 'chess.status.stalemate'
  if (status.isDraw) return 'chess.status.draw'
  if (status.isCheck) return status.turn === 'white' ? 'chess.status.whiteInCheck' : 'chess.status.blackInCheck'
  return status.turn === 'white' ? 'chess.status.whiteToMove' : 'chess.status.blackToMove'
}

/** Lazy-loaded editor view for the chess block. Owns localization (read from the
 *  document locale) and forwards game edits up to the block's prop store. */
export function ChessBlockView({ pgn, orientation, onPgnChange, onOrientationChange }: ChessBlockViewProps) {
  const locale = useDocumentLocale()

  const labels: ChessBoardLabels = {
    flipBoard: translate(locale, 'chess.board.flip'),
    firstMove: translate(locale, 'chess.board.first'),
    previousMove: translate(locale, 'chess.board.previous'),
    nextMove: translate(locale, 'chess.board.next'),
    lastMove: translate(locale, 'chess.board.last'),
    analyze: translate(locale, 'chess.board.analyze'),
  }

  return (
    <ChessBoard
      pgn={pgn}
      orientation={toChessColor(orientation)}
      labels={labels}
      describeStatus={status => translate(locale, chessStatusKey(status))}
      onPgnChange={onPgnChange}
      onOrientationChange={onOrientationChange}
      onAnalyzeToggle={enabled => { if (enabled) trackEvent('chess_engine_analysis_run') }}
    />
  )
}
