# Algorithm Lab

A free, client-side interactive laboratory for learning data structures and algorithms. **Graph Explorer** covers BFS, DFS, Dijkstra and Bellman–Ford, plus self-check questions on Floyd–Warshall, Prim and Kruskal.

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

Interactive classroom preview available at https://joaocalixto.github.io/algo-lab/ with step controls, start selection, frontier and distances. Weighted shortest-path lessons include path reconstruction, negative edges and reachable negative-cycle detection.

Foundation: project setup, domain models, design tokens, internationalization with five baseline locales (en, pt-PT, pt-BR, es, de — all **draft, pending human review**), terminology glossary.

Review questions cover three algorithms the explorer does not animate yet: Floyd–Warshall,
Prim and Kruskal. The question bank lives in `src/domain/questions.ts` and holds message
keys only, so answers survive a language change.

See `docs/I18N.md` (localization architecture) and `docs/GLOSSARY.md` (terminology).

## Deployment

`.github/workflows/pages.yml` validates pull requests and publishes pushes to
`master` (or a manual run on `master`). The build must pass `npm test`,
`npm run i18n:check` and `npm run build` before the deploy job can run.
Use Node.js 22 LTS, at least 22.13, to match the workflow and dependencies.

Repository **Settings → Pages → Source** must be **GitHub Actions**.
The `github-pages` environment must allow the `master` branch. Only the deploy
job receives `pages: write` and `id-token: write`; repository-wide write
permissions and personal access tokens are not required by this workflow.

If a run fails before any steps start, inspect its check annotations. Run
`40090900594` reported an account billing lock, which cannot be fixed in YAML.
The account owner must resolve the billing issue in GitHub settings (or contact
GitHub Support), then run **Actions → Publish laboratory → Run workflow → master**.
Confirm both jobs succeed and open the public site before declaring deployment
complete. A successful local build or a pushed commit alone does not confirm it.

The `gh-pages` branch preserves a locally validated recovery build. Publishing
from that branch is a separate, legacy Pages mode; it does not establish that
the custom Actions workflow is working. Do not switch sources while a Pages
deployment is in progress.
