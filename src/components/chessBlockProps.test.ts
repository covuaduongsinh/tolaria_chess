import { describe, expect, it, vi } from 'vitest'
import { CHESS_BLOCK_TYPE } from '../utils/chessMarkdown'
import {
  updateChessBlockPropsSafely,
  type ChessBlockMutationEditor,
} from './chessBlockProps'

function chessBlock(props: { id?: string; pgn?: string; orientation?: string }) {
  return {
    id: props.id ?? 'chess-block',
    props: {
      pgn: props.pgn ?? '1. e4 e5',
      orientation: props.orientation ?? 'white',
    },
    type: CHESS_BLOCK_TYPE,
  }
}

describe('chess block prop updates', () => {
  it('ignores callbacks after the owning BlockNote block disappears', () => {
    const editor: ChessBlockMutationEditor = {
      getBlock: vi.fn(() => undefined),
      updateBlock: vi.fn(),
    }

    expect(updateChessBlockPropsSafely({
      blockId: 'chess-block',
      editor,
      nextProps: (props) => ({ ...props, pgn: '1. d4' }),
    })).toBe(false)
    expect(editor.updateBlock).not.toHaveBeenCalled()
  })

  it('turns a stale block lookup into a no-op', () => {
    const missingBlockError = new Error('Block with ID chess-block not found')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const editor: ChessBlockMutationEditor = {
      getBlock: vi.fn(() => {
        throw missingBlockError
      }),
      updateBlock: vi.fn(),
    }

    expect(() => updateChessBlockPropsSafely({
      blockId: 'chess-block',
      editor,
      nextProps: (props) => ({ ...props, pgn: '1. c4' }),
    })).not.toThrow()
    expect(editor.updateBlock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith('[editor] Ignored stale chess block update:', missingBlockError)

    warn.mockRestore()
  })

  it('resolves live props before writing an updated move list', () => {
    const editor: ChessBlockMutationEditor = {
      getBlock: vi.fn(() => chessBlock({ pgn: '1. e4', orientation: 'black' })),
      updateBlock: vi.fn(),
    }

    expect(updateChessBlockPropsSafely({
      blockId: 'chess-block',
      editor,
      nextProps: (props) => ({ ...props, pgn: '1. e4 e5' }),
    })).toBe(true)
    expect(editor.updateBlock).toHaveBeenCalledWith('chess-block', {
      props: { pgn: '1. e4 e5', orientation: 'black' },
      type: CHESS_BLOCK_TYPE,
    })
  })

  it('normalizes an unknown orientation to white', () => {
    const editor: ChessBlockMutationEditor = {
      getBlock: vi.fn(() => ({ id: 'chess-block', type: CHESS_BLOCK_TYPE, props: { pgn: '1. e4', orientation: 'sideways' } })),
      updateBlock: vi.fn(),
    }

    updateChessBlockPropsSafely({
      blockId: 'chess-block',
      editor,
      nextProps: (props) => props,
    })
    expect(editor.updateBlock).toHaveBeenCalledWith('chess-block', {
      props: { pgn: '1. e4', orientation: 'white' },
      type: CHESS_BLOCK_TYPE,
    })
  })
})
