---
type: ADR
id: "0140"
title: "Chess integration foundation"
status: active
date: 2026-06-17
---
## Context

Tolaria is being extended with first-class chess support (the product is built by a chess company). The work spans embedding interactive boards in notes, a vault-native game library, engine analysis, and a play/train surface. This ADR records the foundational technical choices shared by every later phase so they are not re-litigated per feature.

The first shipped slice is an interactive **chess block** inside notes. It must round-trip through Markdown like the existing whiteboard and Mermaid blocks, and it must reuse a single board renderer and rules engine that the later phases (game library, play/train) build on.

[[Filesystem as the single source of truth]]

## Decision

**Adopt `chess.js` for rules (move generation, FEN/PGN/SAN, game state) and `chessground` (Lichess' board) for rendering, wrapped in a DOM-free core module under `src/chess/`. Embed boards in notes as a durable BlockNote block (`chessBlock`) that serializes to a fenced ` ```chess ` code block whose body is PGN. Defer the offline engine to Stockfish WASM in a Web Worker, with a native Stockfish sidecar as a later upgrade.**

## Options considered

* **Rules engine** — `chess.js` (chosen): battle-tested, no UI, exposes per-move `before`/`after` FENs which make navigation trivial. Alternatives (hand-rolled, `chessops`) add cost without benefit here.
* **Board renderer** — `chessground` (chosen): supports arrows/highlights/premoves needed by analysis and teaching. `react-chessboard` is simpler but weaker for those features.
* **Persistence** — PGN inside a durable Markdown fence (chosen), mirroring `tldrawMarkdown`/`mermaidMarkdown`. Keeps games in the vault under git, searchable, with no separate store. [[BlockNote rich text editor]]
* **Engine** — Stockfish WASM first (chosen): truly offline, no per-OS binaries, no Rust changes. Native sidecar (bundled like `resources/mcp-server`) is a later strength upgrade.

## Consequences

* New module `src/chess/` owns rules (`chessCore.ts`), the reusable `ChessBoard` (chessground wrapper), and ply navigation. It is reused by the game library and play/train phases.
* The editor gains `chessBlock` via `createReactBlockSpec` in `editorSchema.tsx`; `chessMarkdownCodec` is registered in `editorDurableMarkdown.ts`, so both parse and serialize flow through the existing durable-block pipeline. A `/chess` slash item inserts an empty board.
* Block edits persist through `updateChessBlockPropsSafely` (stale-reference safe), matching the whiteboard pattern.
* The whiteboard's document-locale hook was extracted to `src/hooks/useDocumentLocale.ts` and is now shared with the chess block.
* Re-evaluation trigger: if WASM engine strength/latency proves insufficient for the play/train surface, introduce the native Stockfish sidecar + a Rust UCI bridge.
