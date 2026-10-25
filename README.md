# Algorithm Lab

A free, client-side interactive laboratory for learning data structures and algorithms.
**Graph Explorer** lets you build a graph — with the random generator or by hand — and run
nine algorithms over it step by step: BFS, DFS, connected components, Dijkstra,
Bellman–Ford, Floyd–Warshall, Kruskal, Prim and Kahn. Self-check questions on
Floyd–Warshall, Prim and Kruskal complement the animations.

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

Published at https://joaocalixto.github.io/algo-lab/.

**Graph creation.** The generator takes a vertex count, an edge count and a seed, and
always produces a valid simple graph — connected whenever the requested edge count allows
it — and refuses an impossible request with the reason. The manual editor adds vertices by
clicking the canvas, joins two vertices into an edge, drags vertices, deletes them, edits
weights (negative ones included) and switches the graph between directed/undirected and
weighted/unweighted. Everything the canvas does by mouse is also reachable from the
keyboard, through the buttons and the vertex/edge tables.

**Algorithms.** Each engine in `src/domain/` precomputes an immutable `AlgorithmTrace`;
playback only moves an index over it, so animation can never influence a result. Each one
declares its prerequisites (`src/domain/algorithms.ts`), and an algorithm the current graph
does not satisfy stays visible with the reason spelled out.

**Review questions.** The bank in `src/domain/questions.ts` holds message keys only, so
answers survive a language change.

**Internationalization.** Five baseline locales (en, pt-PT, pt-BR, es, de — all **draft,
pending human review**) and a terminology glossary. See `docs/I18N.md` (localization
architecture) and `docs/GLOSSARY.md` (terminology).

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

The `gh-pages` branch carries the locally validated build: `npm run build`,
then publish the contents of `dist/` to that branch. It is the only route that
works while the Actions billing lock stands, but it only takes effect when
**Settings → Pages → Source** is **Deploy from a branch** (`gh-pages`, `/`),
which makes GitHub's built-in `pages-build-deployment` job pick the push up.
With the source set to **GitHub Actions**, a push to `gh-pages` publishes
nothing and the site keeps serving the last build that did deploy. Publishing
from the branch is a separate, legacy Pages mode; it does not establish that
the custom Actions workflow is working. Do not switch sources while a Pages
deployment is in progress.
