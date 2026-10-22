# Algorithm Lab

A free, client-side interactive laboratory for learning data structures and algorithms. First module: **Graph Explorer** (BFS and DFS).

## Setup

Requires Node.js ≥ 22.

```sh
npm install
npm run dev        # local dev server
npm test           # unit and component tests
npm run i18n:check # translation completeness, placeholders, plurals, coverage table
npm run build      # type-check + production build into dist/
```

## Status

Milestone 1 (foundation) complete: project setup, domain models, design tokens, internationalization with five baseline locales (en, pt-PT, pt-BR, es, de — all **draft, pending human review**), terminology glossary.

See `docs/I18N.md` (localization architecture) and `docs/GLOSSARY.md` (terminology).
