# Vendored chess engine

Stockfish WASM single-threaded build, copied verbatim from the npm package
`stockfish.js@10.0.2` (`node_modules/stockfish.js/`).

Served as static assets so the Web Worker can load them offline in both Vite dev
and the bundled Tauri app. Loaded by `src/chess/engine/engineClient.ts` via
`new Worker('/engine/stockfish.wasm.js')`. Do not edit by hand; re-copy from the
package to update.
