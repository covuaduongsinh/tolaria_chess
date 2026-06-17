// Fetches a user's games as PGN from Lichess or Chess.com. Both expose public,
// CORS-enabled APIs, so the webview fetches directly (the app CSP allows https:);
// the returned PGN feeds the same import pipeline as pasted text.

export type ChessImportSource = 'lichess' | 'chesscom'

const LICHESS_MAX_GAMES = 20

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const response = await fetch(url, headers ? { headers } : undefined)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.text()
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json()
}

export async function fetchLichessGames(username: string): Promise<string> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${LICHESS_MAX_GAMES}`
  return fetchText(url, { Accept: 'application/x-chess-pgn' })
}

export function latestArchiveUrl(payload: unknown): string | null {
  const archives = (payload as { archives?: unknown } | null)?.archives
  if (!Array.isArray(archives) || archives.length === 0) return null
  const last = archives[archives.length - 1]
  return typeof last === 'string' ? last : null
}

export function pgnsFromArchive(payload: unknown): string[] {
  const games = (payload as { games?: unknown } | null)?.games
  if (!Array.isArray(games)) return []
  return games
    .map((game) => (game as { pgn?: unknown })?.pgn)
    .filter((pgn): pgn is string => typeof pgn === 'string' && pgn.trim() !== '')
}

export async function fetchChessComGames(username: string): Promise<string> {
  const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`
  const archiveUrl = latestArchiveUrl(await fetchJson(archivesUrl))
  if (!archiveUrl) return ''
  return pgnsFromArchive(await fetchJson(archiveUrl)).join('\n\n')
}

export function fetchOnlineGames(source: ChessImportSource, username: string): Promise<string> {
  return source === 'lichess' ? fetchLichessGames(username) : fetchChessComGames(username)
}
