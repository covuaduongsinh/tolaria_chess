---
type: ADR
id: "0141"
title: "Chess games as knowledge-graph entities"
status: active
date: 2026-06-18
---
## Context

[[Chess integration foundation]] (ADR-0140) shipped imported games as `Chess Game` notes whose metadata (`chess_white`, `chess_black`, `chess_event`, `chess_eco`, …) was written as **flat scalar frontmatter**. Those notes were searchable but otherwise isolated: players, openings, and events were plain strings, so none of Tolaria's graph machinery — wikilink relationships, backlinks, Neighborhood mode, sidebar type grouping — applied to chess data. There was also no home to attach later documents (player dossiers, opening theory, tournament records) to.

Tolaria already treats any frontmatter field containing a `[[wikilink]]` as a navigable relationship (ADR-0010) and identifies entity types purely from the `type:` field via root-created type documents ([[Root-created type documents]], ADR-0096). The cheapest way to integrate chess with knowledge is therefore to make the importer **emit graph-native data**, not to build new chess-specific browsing UI.

## Decision

**Chess imports produce knowledge-graph entities.** A single import batch plans, in dependency order:

1. **Type documents** for `Chess Game`, `Chess Player`, `Chess Opening`, and `Chess Event` (icon/color/sidebar-label/sort), seeded once and skipped if a same-named `type: Type` note already exists.
2. **Stub entity notes** (`type: Chess Player` / `Chess Opening` / `Chess Event`) for each distinct player, opening (keyed by ECO), and event, **idempotently** — an entity that resolves to an existing vault note (by filename stem, title, or alias) is reused instead of duplicated.
3. **Game notes** whose `chess_white`/`chess_black`/`chess_event`/`chess_opening` are `[[wikilinks]]` to those entities (so they become relationships + backlinks), while `chess_result`/`chess_date`/`chess_eco` stay scalar for filtering.

Players named `"Lastname, Firstname"` are normalized to natural order with the raw form kept as an alias, so later imports in either form resolve to one note. The flow is pure planning plus an injected `createNote` runner (`src/chess/chessEntities.ts`, `chessTypeSeeds.ts`, `chessGameImport.ts`); no new database, no new app-shell view, no `SidebarSelection` kind. Applies to new imports only.

## Options considered

* **Emit wikilink relationships + auto-created entities** (chosen): games join the existing graph for free; entities are durable homes for documents. Cost: an import can create many stub notes (bounded by idempotent reuse across imports).
* **Wikilinks without pre-created stubs**: keeps the vault smaller but leaves unresolved links and no home for documents until the user creates each note.
* **Keep flat scalars, add chess-specific browsing UI**: duplicates graph features Tolaria already has and does not give documents an anchor.

## Consequences

* Players/openings/events are first-class entities: backlinks list every game, Neighborhood groups them, and the sidebar shows grouped, colored sections.
* `chess_white`/`chess_black`/etc. move from `properties` to `relationships`; saved-View filters on players now match wikilinks. `chess_eco` stays scalar for opening-family filtering.
* Repeated imports converge on one connected graph because entities resolve against existing notes before creation.
* Re-evaluation trigger: if stub-note volume becomes noisy, add an import option to link-only (no stub creation) or to backfill/relink already-imported games.
