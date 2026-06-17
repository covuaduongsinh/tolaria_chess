import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchChessComGames,
  fetchLichessGames,
  fetchOnlineGames,
  latestArchiveUrl,
  pgnsFromArchive,
} from './chessOnlineImport'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('latestArchiveUrl / pgnsFromArchive', () => {
  it('returns the most recent archive URL', () => {
    expect(latestArchiveUrl({ archives: ['a', 'b', 'c'] })).toBe('c')
    expect(latestArchiveUrl({ archives: [] })).toBeNull()
    expect(latestArchiveUrl({})).toBeNull()
  })

  it('extracts non-empty PGNs from an archive payload', () => {
    expect(pgnsFromArchive({ games: [{ pgn: '1. e4' }, { pgn: '' }, { other: 1 }, { pgn: '1. d4' }] }))
      .toEqual(['1. e4', '1. d4'])
    expect(pgnsFromArchive({})).toEqual([])
  })
})

describe('fetchLichessGames', () => {
  it('requests the user games endpoint as PGN', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('1. e4 e5', { status: 200 }))
    const pgn = await fetchLichessGames('MagnusCarlsen')

    expect(pgn).toBe('1. e4 e5')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://lichess.org/api/games/user/MagnusCarlsen')
    expect((init as RequestInit).headers).toMatchObject({ Accept: 'application/x-chess-pgn' })
  })

  it('throws on a failed response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }))
    await expect(fetchLichessGames('nobody')).rejects.toThrow('404')
  })
})

describe('fetchChessComGames', () => {
  it('reads the latest archive and joins its PGNs', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ archives: ['https://api.chess.com/pub/player/x/games/2024/05'] }))
      .mockResolvedValueOnce(jsonResponse({ games: [{ pgn: '1. e4 e5' }, { pgn: '1. d4 d5' }] }))

    expect(await fetchChessComGames('X')).toBe('1. e4 e5\n\n1. d4 d5')
  })

  it('returns empty when there are no archives', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ archives: [] }))
    expect(await fetchChessComGames('newbie')).toBe('')
  })
})

describe('fetchOnlineGames', () => {
  it('routes to the chosen source', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('1. e4', { status: 200 }))
    await fetchOnlineGames('lichess', 'someone')
    expect(fetchMock.mock.calls[0][0]).toContain('lichess.org')
  })
})
