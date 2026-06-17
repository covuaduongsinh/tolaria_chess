// Durable markdown codec for the chess block. A chess block round-trips through a
// fenced ```chess code block whose body is the PGN move text and whose `orientation`
// attribute records which side is shown at the bottom. Mirrors tldrawMarkdown.ts.

import {
  type BlockLike,
  type DurableBlockCodec,
  type DurableFencePayloadInput,
  injectDurableMarkdownBlocks,
  preProcessDurableMarkdownBlocks,
  readCodeBlockLanguage,
  readInlineText,
} from './durableMarkdownBlocks'

export const CHESS_BLOCK_TYPE = 'chessBlock'
export const CHESS_DEFAULT_ORIENTATION = 'white'

const TOKEN_PREFIX = '@@TOLARIA_CHESS_BLOCK:'
const TOKEN_SUFFIX = '@@'

interface ChessPayload {
  pgn: string
  orientation: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOrientation(value: unknown): string {
  return value === 'black' ? 'black' : CHESS_DEFAULT_ORIENTATION
}

function decodeChessPayload(payload: unknown): ChessPayload | null {
  if (!isRecord(payload)) return null
  if (typeof payload.pgn !== 'string') return null
  return { pgn: payload.pgn, orientation: normalizeOrientation(payload.orientation) }
}

function readFenceAttribute(info: string, name: string): string {
  for (const match of info.matchAll(/\b([A-Za-z][\w-]*)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/gu)) {
    if (match.at(1) === name) return match.at(2) ?? match.at(3) ?? match.at(4) ?? ''
  }
  return ''
}

function readChessFenceMetadata(info: string): Pick<ChessPayload, 'orientation'> | null {
  const [language = '', ...infoParts] = info.trim().split(/\s+/u)
  if (language.toLowerCase() !== 'chess') return null
  return { orientation: normalizeOrientation(readFenceAttribute(infoParts.join(' '), 'orientation')) }
}

function buildChessPayload({ lines, start, end, metadata }: DurableFencePayloadInput): ChessPayload {
  const fenceMetadata = metadata as Pick<ChessPayload, 'orientation'>
  return {
    orientation: fenceMetadata.orientation,
    pgn: lines.slice(start + 1, end).join('').trim(),
  }
}

function buildChessBlock(block: BlockLike, payload: ChessPayload): BlockLike {
  return {
    ...block,
    type: CHESS_BLOCK_TYPE,
    props: {
      ...(block.props ?? {}),
      pgn: payload.pgn,
      orientation: payload.orientation,
    },
    content: undefined,
    children: [],
  }
}

function readChessCodeBlock(block: BlockLike): ChessPayload | null {
  if (block.type !== 'codeBlock') return null
  if (readCodeBlockLanguage({ block }) !== 'chess') return null

  const pgn = readInlineText(block.content)
  if (pgn === null) return null
  return { pgn: pgn.trim(), orientation: CHESS_DEFAULT_ORIENTATION }
}

function fenceLengthForBody(body: string): number {
  const longestRun = Math.max(0, ...Array.from(body.matchAll(/`+/gu), match => match[0].length))
  return Math.max(3, longestRun + 1)
}

function chessFenceMetadata(orientation: string): string {
  return orientation === 'black' ? ' orientation="black"' : ''
}

export function chessFenceSource({ pgn, orientation }: ChessPayload): string {
  const body = pgn.trim()
  const fence = '`'.repeat(fenceLengthForBody(body))
  const bodyBlock = body ? `${body}\n` : ''
  return `${fence}chess${chessFenceMetadata(orientation)}\n${bodyBlock}${fence}`
}

export function isChessBlock(block: BlockLike): boolean {
  return block.type === CHESS_BLOCK_TYPE && typeof block.props?.pgn === 'string'
}

export function chessMarkdown(block: BlockLike): string {
  const props = block.props ?? {}
  return chessFenceSource({
    pgn: props.pgn ?? '',
    orientation: normalizeOrientation(props.orientation),
  })
}

export const chessMarkdownCodec: DurableBlockCodec = {
  tokenPrefix: TOKEN_PREFIX,
  tokenSuffix: TOKEN_SUFFIX,
  readFenceMetadata: readChessFenceMetadata,
  buildPayload: buildChessPayload,
  decodePayload: decodeChessPayload,
  buildBlock: (block, payload) => buildChessBlock(block, payload as ChessPayload),
  readCodeBlock: readChessCodeBlock,
  isBlock: isChessBlock,
  serializeBlock: chessMarkdown,
}

export function preProcessChessMarkdown({ markdown }: { markdown: string }): string {
  return preProcessDurableMarkdownBlocks({ markdown, codecs: [chessMarkdownCodec] })
}

export function injectChessInBlocks(blocks: unknown[]): unknown[] {
  return injectDurableMarkdownBlocks({ blocks, codecs: [chessMarkdownCodec] })
}
