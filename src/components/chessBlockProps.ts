import { CHESS_BLOCK_TYPE, CHESS_DEFAULT_ORIENTATION } from '../utils/chessMarkdown'

export interface ChessBlockProps {
  pgn: string
  orientation: string
}

export interface ChessBlockMutationEditor {
  getBlock: (blockId: string) => unknown
  updateBlock: (blockId: string, update: ChessBlockUpdate) => unknown
}

interface ChessBlockUpdate {
  props: ChessBlockProps
  type: typeof CHESS_BLOCK_TYPE
}

interface LiveChessBlock {
  id: string
  props: ChessBlockProps
}

interface ChessBlockMutation {
  blockId: string
  editor: ChessBlockMutationEditor
  nextProps: (props: ChessBlockProps) => ChessBlockProps
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOrientation(value: unknown): string {
  return value === 'black' ? 'black' : CHESS_DEFAULT_ORIENTATION
}

function chessBlockProps(value: unknown): ChessBlockProps | null {
  if (!isRecord(value)) return null
  if (typeof value.pgn !== 'string') return null
  return { pgn: value.pgn, orientation: normalizeOrientation(value.orientation) }
}

function liveChessBlock(value: unknown): LiveChessBlock | null {
  if (!isRecord(value)) return null
  if (value.type !== CHESS_BLOCK_TYPE || typeof value.id !== 'string') return null

  const props = chessBlockProps(value.props)
  return props ? { id: value.id, props } : null
}

function isMissingBlockError(error: unknown): error is Error {
  return error instanceof Error
    && error.message.includes('Block with ID')
    && error.message.includes('not found')
}

function warnStaleChessBlockUpdate(error: Error) {
  console.warn('[editor] Ignored stale chess block update:', error)
}

function getLiveChessBlock(editor: ChessBlockMutationEditor, blockId: string) {
  try {
    return liveChessBlock(editor.getBlock(blockId))
  } catch (error) {
    if (!isMissingBlockError(error)) throw error

    warnStaleChessBlockUpdate(error)
    return null
  }
}

export function updateChessBlockPropsSafely({ blockId, editor, nextProps }: ChessBlockMutation) {
  const liveBlock = getLiveChessBlock(editor, blockId)
  if (!liveBlock) return false

  try {
    editor.updateBlock(liveBlock.id, {
      props: nextProps(liveBlock.props),
      type: CHESS_BLOCK_TYPE,
    })
    return true
  } catch (error) {
    if (!isMissingBlockError(error)) throw error

    warnStaleChessBlockUpdate(error)
    return false
  }
}
