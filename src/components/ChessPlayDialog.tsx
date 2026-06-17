import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { ChessBoard, type ChessBoardLabels } from '../chess/ChessBoard'
import { useEngineGame, type EngineGame } from '../chess/engine/useEngineGame'
import type { EngineWorkerFactory } from '../chess/engine/engineClient'
import { useDocumentLocale } from '../hooks/useDocumentLocale'
import { translate, type AppLocale, type TranslationKey } from '../lib/i18n'

export interface ChessPlayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Injectable engine worker factory (tests pass a fake). */
  createWorker?: EngineWorkerFactory
}

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTY_DEPTHS: Record<Difficulty, number> = { easy: 4, medium: 12, hard: 18 }
const DIFFICULTY_LABEL_KEYS: Record<Difficulty, TranslationKey> = {
  easy: 'chess.play.easy',
  medium: 'chess.play.medium',
  hard: 'chess.play.hard',
}
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']

function boardLabels(locale: AppLocale): ChessBoardLabels {
  return {
    flipBoard: translate(locale, 'chess.board.flip'),
    firstMove: translate(locale, 'chess.board.first'),
    previousMove: translate(locale, 'chess.board.previous'),
    nextMove: translate(locale, 'chess.board.next'),
    lastMove: translate(locale, 'chess.board.last'),
    analyze: translate(locale, 'chess.board.analyze'),
  }
}

function playStatusKey(game: EngineGame): TranslationKey {
  if (game.status.isCheckmate) {
    return game.status.turn === game.playerColor ? 'chess.play.youLost' : 'chess.play.youWon'
  }
  if (game.status.isStalemate || game.status.isDraw) return 'chess.play.draw'
  return game.thinking ? 'chess.play.engineThinking' : 'chess.play.yourTurn'
}

/** Modal for playing a full game against Stockfish. The engine answers every move
 *  the human makes on the board (see useEngineGame); difficulty sets search depth. */
export function ChessPlayDialog({ open, onOpenChange, createWorker }: ChessPlayDialogProps) {
  const locale = useDocumentLocale()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const game = useEngineGame({ depth: DIFFICULTY_DEPTHS[difficulty], createWorker })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate(locale, 'chess.play.title')}</DialogTitle>
          <DialogDescription>{translate(locale, 'chess.play.description')}</DialogDescription>
        </DialogHeader>
        <div className="tolaria-chess-play__controls">
          <Button
            type="button"
            size="sm"
            variant={game.playerColor === 'white' ? 'default' : 'outline'}
            onClick={() => game.setPlayerColor('white')}
          >
            {translate(locale, 'chess.play.playAsWhite')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={game.playerColor === 'black' ? 'default' : 'outline'}
            onClick={() => game.setPlayerColor('black')}
          >
            {translate(locale, 'chess.play.playAsBlack')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={game.reset}>
            {translate(locale, 'chess.play.newGame')}
          </Button>
        </div>
        <div className="tolaria-chess-play__controls" role="group" aria-label={translate(locale, 'chess.play.difficulty')}>
          {DIFFICULTIES.map((level) => (
            <Button
              key={level}
              type="button"
              size="xs"
              variant={difficulty === level ? 'secondary' : 'ghost'}
              onClick={() => setDifficulty(level)}
            >
              {translate(locale, DIFFICULTY_LABEL_KEYS[level])}
            </Button>
          ))}
        </div>
        <p className="tolaria-chess-play__status" role="status">{translate(locale, playStatusKey(game))}</p>
        <ChessBoard
          pgn={game.pgn}
          orientation={game.playerColor}
          playableColor={game.playerColor}
          labels={boardLabels(locale)}
          onPgnChange={game.onPlayerMove}
        />
      </DialogContent>
    </Dialog>
  )
}
