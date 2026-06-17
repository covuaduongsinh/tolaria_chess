import { describe, expect, it, vi } from 'vitest'
import {
  CHESS_BLOCK_TYPE,
  chessFenceSource,
  injectChessInBlocks,
  isChessBlock,
  preProcessChessMarkdown,
} from './chessMarkdown'
import { serializeDurableEditorBlocks } from './editorDurableMarkdown'

type ChessBlock = { type: string; props: { pgn: string; orientation: string } }

function injectFromMarkdown(markdown: string): ChessBlock {
  const preprocessed = preProcessChessMarkdown({ markdown })
  const blocks = [{
    type: 'paragraph',
    content: [{ type: 'text', text: preprocessed, styles: {} }],
    children: [],
  }]
  return injectChessInBlocks(blocks)[0] as ChessBlock
}

const textEditor = {
  blocksToMarkdownLossy: vi.fn((blocks: unknown[]) => {
    return (blocks as Array<{ content?: Array<{ text?: string }> }>)
      .map((block) => block.content?.map((item) => item.text ?? '').join('') ?? '')
      .join('\n\n')
  }),
}

describe('chess markdown round-trip', () => {
  it('injects a fenced chess block with PGN and default orientation', () => {
    const block = injectFromMarkdown('```chess\n1. e4 e5 2. Nf3 Nc6\n```')
    expect(block.type).toBe(CHESS_BLOCK_TYPE)
    expect(block.props.pgn).toBe('1. e4 e5 2. Nf3 Nc6')
    expect(block.props.orientation).toBe('white')
  })

  it('reads the orientation attribute from the fence', () => {
    const block = injectFromMarkdown('```chess orientation="black"\n1. d4\n```')
    expect(block.props.orientation).toBe('black')
    expect(block.props.pgn).toBe('1. d4')
  })

  it('injects parsed `chess` code blocks into chess blocks', () => {
    const [block] = injectChessInBlocks([{
      type: 'codeBlock',
      props: { language: 'chess' },
      content: [{ type: 'text', text: '1. e4 e5', styles: {} }],
      children: [],
    }]) as ChessBlock[]

    expect(block.type).toBe(CHESS_BLOCK_TYPE)
    expect(block.props.pgn).toBe('1. e4 e5')
  })

  it('serializes a chess block back to a fence beside ordinary Markdown', () => {
    const blocks = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }], children: [] },
      { type: CHESS_BLOCK_TYPE, props: { pgn: '1. e4 e5', orientation: 'white' }, children: [] },
    ]

    expect(serializeDurableEditorBlocks(textEditor, blocks)).toBe([
      'Intro',
      '```chess\n1. e4 e5\n```',
    ].join('\n\n'))
  })

  it('records a non-default orientation when serializing', () => {
    const blocks = [{ type: CHESS_BLOCK_TYPE, props: { pgn: '1. d4', orientation: 'black' }, children: [] }]
    expect(serializeDurableEditorBlocks(textEditor, blocks)).toBe('```chess orientation="black"\n1. d4\n```')
  })

  it('serializes an empty board to an empty fence', () => {
    expect(chessFenceSource({ pgn: '', orientation: 'white' })).toBe('```chess\n```')
  })

  it('survives a full inject -> serialize round-trip', () => {
    const markdown = '```chess orientation="black"\n1. e4 c5 2. Nf3 d6\n```'
    const block = injectFromMarkdown(markdown)
    expect(serializeDurableEditorBlocks(textEditor, [block])).toBe(markdown)
  })

  it('recognizes chess blocks by shape', () => {
    expect(isChessBlock({ type: CHESS_BLOCK_TYPE, props: { pgn: '1. e4' } })).toBe(true)
    expect(isChessBlock({ type: 'paragraph' })).toBe(false)
    expect(isChessBlock({ type: CHESS_BLOCK_TYPE, props: {} })).toBe(false)
  })
})
