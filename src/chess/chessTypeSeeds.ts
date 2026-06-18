// Type-document seeds for the chess knowledge schema. Imports ensure these exist so
// Chess Games/Players/Openings/Events get sidebar grouping, icons, colors, and a
// default sort — the home that later documents (player dossiers, opening theory,
// tournament records) attach to. Pure: the import planner skips any already present.

interface ChessTypeDefinition {
  name: string
  icon: string
  color: string
  sidebarLabel: string
  sort: string
  description: string
}

const CHESS_TYPE_DEFINITIONS: readonly ChessTypeDefinition[] = [
  {
    name: 'Chess Game',
    icon: 'crown',
    color: 'teal',
    sidebarLabel: 'Chess Games',
    sort: 'chess_date:desc',
    description: 'Imported games. Players, opening, and event are linked as relationships.',
  },
  {
    name: 'Chess Player',
    icon: 'user',
    color: 'blue',
    sidebarLabel: 'Players',
    sort: 'title:asc',
    description: 'A player. Their games link here, so backlinks list every game they played.',
  },
  {
    name: 'Chess Opening',
    icon: 'book-open',
    color: 'purple',
    sidebarLabel: 'Openings',
    sort: 'chess_eco:asc',
    description: 'An opening, keyed by ECO. A home for opening theory and model games.',
  },
  {
    name: 'Chess Event',
    icon: 'trophy',
    color: 'orange',
    sidebarLabel: 'Events',
    sort: 'title:asc',
    description: 'A tournament or match. Its games link here for a grouped record.',
  },
]

export const CHESS_TYPE_NAMES: readonly string[] = CHESS_TYPE_DEFINITIONS.map((definition) => definition.name)

export interface ChessTypeSeed {
  /** Type name (the `type:` value its instances carry). */
  name: string
  /** Full type-document markdown. */
  content: string
}

function typeDocumentContent(definition: ChessTypeDefinition): string {
  const frontmatter = [
    '---',
    'type: Type',
    `icon: ${definition.icon}`,
    `color: ${definition.color}`,
    `sidebar label: ${definition.sidebarLabel}`,
    `sort: ${definition.sort}`,
    '---',
  ].join('\n')
  return `${frontmatter}\n\n# ${definition.name}\n\n${definition.description}\n`
}

/** Seeds for every chess type whose name is not already present in the vault. */
export function planChessTypeSeeds(existingTypeTitles: readonly string[]): ChessTypeSeed[] {
  const taken = new Set(existingTypeTitles.map((title) => title.toLowerCase()))
  return CHESS_TYPE_DEFINITIONS
    .filter((definition) => !taken.has(definition.name.toLowerCase()))
    .map((definition) => ({ name: definition.name, content: typeDocumentContent(definition) }))
}
