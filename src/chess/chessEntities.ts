// Pure entity extraction for chess imports. Turns parsed games into the wikilink
// targets each game note should carry plus the distinct Player/Opening/Event notes
// the import should create — reusing any matching note already in the vault so repeat
// imports grow one connected graph instead of duplicating entities.

import type { ChessGameImport } from './pgnImport'
import { sanitizeNoteBaseName, yamlQuote, type ChessGameLinks } from './chessGameNote'

export type ChessEntityKind = 'player' | 'opening' | 'event'

export const CHESS_ENTITY_TYPE: Record<ChessEntityKind, string> = {
  player: 'Chess Player',
  opening: 'Chess Opening',
  event: 'Chess Event',
}

/** Minimal view of an existing vault note, used to resolve/reuse entities. */
export interface KnownNote {
  /** Filename stem without the `.md` extension. */
  stem: string
  title: string
  aliases: readonly string[]
}

/** A stub entity note the import should create (only when nothing already matches). */
export interface ChessEntityNote {
  type: string
  title: string
  /** Wikilink target and filename stem (sanitized from the title). */
  target: string
  aliases: string[]
}

export interface ChessEntityPlan {
  /** Per-game wikilink targets, parallel to the input games array. */
  links: ChessGameLinks[]
  /** Distinct new entity notes to create, in stable encounter order. */
  entities: ChessEntityNote[]
}

/** Swap a single "Lastname, Firstname" into natural order; leave anything else as-is. */
export function normalizePlayerName(raw: string): string {
  const parts = raw.split(',')
  if (parts.length !== 2) return raw.trim()
  const [last, first] = parts.map((part) => part.trim())
  return last && first ? `${first} ${last}` : raw.trim()
}

/** Combine ECO and opening name into a stable title, or null when both are empty. */
export function buildOpeningTitle(eco: string, opening: string): string | null {
  const title = [eco.trim(), opening.trim()].filter(Boolean).join(' ')
  return title || null
}

interface EntityCandidate {
  kind: ChessEntityKind
  /** Stable identity within a batch (e.g. openings unify on ECO). */
  idKey: string
  title: string
  aliases: string[]
}

function playerCandidate(raw: string): EntityCandidate | null {
  if (!raw) return null
  const title = normalizePlayerName(raw)
  const aliases = raw !== title ? [raw] : []
  return { kind: 'player', idKey: `player:${title.toLowerCase()}`, title, aliases }
}

function openingCandidate(eco: string, opening: string): EntityCandidate | null {
  const title = buildOpeningTitle(eco, opening)
  if (!title) return null
  const aliases = eco && title.toLowerCase() !== eco.toLowerCase() ? [eco] : []
  const idKey = eco ? `opening-eco:${eco.toLowerCase()}` : `opening:${title.toLowerCase()}`
  return { kind: 'opening', idKey, title, aliases }
}

function eventCandidate(event: string): EntityCandidate | null {
  if (!event) return null
  return { kind: 'event', idKey: `event:${event.toLowerCase()}`, title: event, aliases: [] }
}

function matchExistingTarget(candidate: EntityCandidate, existing: readonly KnownNote[]): string | null {
  const terms = new Set([candidate.title, ...candidate.aliases].map((term) => term.toLowerCase()))
  const match = existing.find((note) =>
    terms.has(note.stem.toLowerCase())
    || terms.has(note.title.toLowerCase())
    || note.aliases.some((alias) => terms.has(alias.toLowerCase())),
  )
  return match ? match.stem : null
}

class EntityResolver {
  private readonly resolved = new Map<string, string>()
  readonly entities: ChessEntityNote[] = []
  private readonly existing: readonly KnownNote[]

  constructor(existing: readonly KnownNote[]) {
    this.existing = existing
  }

  /** Return the wikilink target for a candidate, planning a new stub note if needed. */
  resolve(candidate: EntityCandidate | null): string | null {
    if (!candidate) return null
    const cached = this.resolved.get(candidate.idKey)
    if (cached) return cached

    const reused = matchExistingTarget(candidate, this.existing)
    const target = reused ?? sanitizeNoteBaseName(candidate.title)
    this.resolved.set(candidate.idKey, target)
    if (!reused) {
      this.entities.push({
        type: CHESS_ENTITY_TYPE[candidate.kind],
        title: candidate.title,
        target,
        aliases: candidate.aliases,
      })
    }
    return target
  }
}

/** Full note content for a stub entity: typed frontmatter (with aliases) and an H1. */
export function buildChessEntityNoteContent(entity: ChessEntityNote): string {
  const lines = [`type: ${entity.type}`]
  if (entity.aliases.length > 0) {
    lines.push('aliases:')
    for (const alias of entity.aliases) lines.push(`  - ${yamlQuote(alias)}`)
  }
  return `---\n${lines.join('\n')}\n---\n\n# ${entity.title}\n`
}

/** Build per-game wikilink targets and the distinct new entity notes for an import batch. */
export function planChessEntities(
  games: readonly ChessGameImport[],
  existingNotes: readonly KnownNote[],
): ChessEntityPlan {
  const resolver = new EntityResolver(existingNotes)
  const links = games.map((game) => {
    const { white, black, event, eco, opening } = game.headers
    return {
      white: resolver.resolve(playerCandidate(white)),
      black: resolver.resolve(playerCandidate(black)),
      opening: resolver.resolve(openingCandidate(eco, opening)),
      event: resolver.resolve(eventCandidate(event)),
    }
  })
  return { links, entities: resolver.entities }
}
