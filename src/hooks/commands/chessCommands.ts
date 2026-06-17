import type { CommandAction } from './types'

export interface ChessCommandsConfig {
  onImportChessGames?: () => void
  onPlayChess?: () => void
}

export function buildChessCommands({ onImportChessGames, onPlayChess }: ChessCommandsConfig): CommandAction[] {
  const commands: CommandAction[] = []

  if (onImportChessGames) {
    commands.push({
      id: 'import-chess-games',
      label: 'Import chess games',
      group: 'Note',
      keywords: ['chess', 'pgn', 'game', 'import'],
      enabled: true,
      execute: onImportChessGames,
    })
  }

  if (onPlayChess) {
    commands.push({
      id: 'play-chess',
      label: 'Play chess vs computer',
      group: 'Note',
      keywords: ['chess', 'play', 'stockfish', 'engine', 'computer'],
      enabled: true,
      execute: onPlayChess,
    })
  }

  return commands
}
