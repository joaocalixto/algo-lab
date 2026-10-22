# Algorithm Lab — conventions

Client-only educational DSA platform (React 19 + TS strict + Vite, Vitest/RTL, i18next). Deployed to GitHub Pages (`base: './'`).

## Commands
- `npm run dev` · `npm test` · `npm run typecheck` · `npm run i18n:check` · `npm run build`

## Architecture
- `src/domain/` — pure types and (from M2) algorithm engines. No React, no i18n, no timing.
- Engines precompute an immutable `TraversalTrace` (array of snapshots); playback only moves an index. Animation never affects correctness.
- Snapshots carry `MessageDescriptor`s (key + values), never rendered strings.
- `src/i18n/` — locale registry (`locales.ts`), lazy resources, validation. `src/app/` — UI. `src/styles/tokens.css` — all design values.

## Rules
- Correctness first. Semantics are documented in `src/domain/traversal.ts`; DFS = explicit stack of frames (matches recursive DFS order). Traversal covers only the start vertex's component.
- No user-facing string in components: add keys to `en` and all mandatory locales (en, pt-PT, pt-BR, es, de); use glossary terms (`docs/GLOSSARY.md`).
- Never mark a locale `reviewed` — only a human reviewer does.
- Never convey state by color alone; respect reduced motion; use logical CSS properties (RTL).
- Keep dependencies minimal. Work milestone by milestone; stop for review after each.
