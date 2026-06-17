import { describe, expect, it, vi } from 'vitest'
import { buildChessCommands } from './chessCommands'

describe('buildChessCommands', () => {
  it('returns no commands when no handler is provided', () => {
    expect(buildChessCommands({})).toEqual([])
  })

  it('builds an enabled import command in the Note group that runs the handler', () => {
    const onImportChessGames = vi.fn()
    const commands = buildChessCommands({ onImportChessGames })

    expect(commands).toHaveLength(1)
    expect(commands[0]).toMatchObject({ id: 'import-chess-games', group: 'Note', enabled: true })
    commands[0].execute()
    expect(onImportChessGames).toHaveBeenCalledTimes(1)
  })

  it('builds a play command that runs its handler', () => {
    const onPlayChess = vi.fn()
    const commands = buildChessCommands({ onPlayChess })

    expect(commands.map((command) => command.id)).toEqual(['play-chess'])
    commands[0].execute()
    expect(onPlayChess).toHaveBeenCalledTimes(1)
  })
})
