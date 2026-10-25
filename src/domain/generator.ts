/**
 * Random graph generator.
 *
 * Guarantees, for any accepted request:
 * - exactly `vertexCount` vertices and exactly `edgeCount` edges;
 * - simple: no self-loops, and at most one edge per unordered pair (undirected)
 *   or per ordered pair (directed), so u→v and v→u may coexist when directed;
 * - connected whenever the requested edge count allows it (`edgeCount ≥ n − 1`):
 *   a random spanning tree is laid down first and the remaining edges are drawn
 *   from the pairs it did not use. In a directed graph the tree is oriented away
 *   from its root, so every vertex is reachable from that root; the extra arcs
 *   get a random orientation and may create cycles.
 * - reproducible: the same options (seed included) always produce the same graph.
 */

import { type Edge, type Graph, maxEdgeCount, minEdgesToConnect, type Vertex } from './graph';
import { createRandom } from './random';

export const MIN_VERTICES = 1;
/** 26 keeps every label a single letter, which keeps the drawing readable. */
export const MAX_VERTICES = 26;

export const WEIGHT_MIN = 1;
export const WEIGHT_MAX = 9;
/** Lowest weight drawn when negative weights are allowed (for Bellman–Ford). */
export const NEGATIVE_WEIGHT_MIN = -5;

export interface GeneratorOptions {
  readonly vertexCount: number;
  readonly edgeCount: number;
  readonly directed: boolean;
  readonly weighted: boolean;
  /** Weighted graphs only: draw some weights below zero, which Dijkstra rejects. */
  readonly allowNegativeWeights: boolean;
  readonly seed: number;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  vertexCount: 7,
  edgeCount: 9,
  directed: false,
  weighted: true,
  allowNegativeWeights: false,
  seed: 1,
};

/** What a given vertex count and direction allow. */
export interface GeneratorLimits {
  /** Fewest edges that can still connect every vertex. */
  readonly connectedThreshold: number;
  readonly maxEdges: number;
}

export function generatorLimits(vertexCount: number, directed: boolean): GeneratorLimits {
  return { connectedThreshold: minEdgesToConnect(vertexCount), maxEdges: maxEdgeCount(vertexCount, directed) };
}

export type GeneratorProblem =
  | { readonly kind: 'vertexCountOutOfRange'; readonly min: number; readonly max: number }
  | { readonly kind: 'negativeEdgeCount' }
  /** More edges than a simple graph of this size can hold. */
  | { readonly kind: 'tooManyEdges'; readonly maxEdges: number };

/** Every reason the request cannot be satisfied, so the UI can explain all of them. */
export function validateGeneratorOptions(options: GeneratorOptions): readonly GeneratorProblem[] {
  const problems: GeneratorProblem[] = [];
  if (
    !Number.isInteger(options.vertexCount) ||
    options.vertexCount < MIN_VERTICES ||
    options.vertexCount > MAX_VERTICES
  )
    problems.push({ kind: 'vertexCountOutOfRange', min: MIN_VERTICES, max: MAX_VERTICES });
  if (!Number.isInteger(options.edgeCount) || options.edgeCount < 0) problems.push({ kind: 'negativeEdgeCount' });
  const { maxEdges } = generatorLimits(options.vertexCount, options.directed);
  if (Number.isInteger(options.edgeCount) && options.edgeCount > maxEdges) problems.push({ kind: 'tooManyEdges', maxEdges });
  return problems;
}

/** True when the generator will be able to connect every vertex. */
export function willBeConnected(options: GeneratorOptions): boolean {
  return options.edgeCount >= generatorLimits(options.vertexCount, options.directed).connectedThreshold;
}

/** "A", "B", … "Z". Vertex ids are separate from labels and never shown. */
export function defaultLabel(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

export function generateGraph(options: GeneratorOptions): Graph {
  const problems = validateGeneratorOptions(options);
  if (problems.length > 0) throw new Error(`Cannot generate graph: ${problems.map((p) => p.kind).join(', ')}`);

  const random = createRandom(options.seed);
  const vertices: Vertex[] = Array.from({ length: options.vertexCount }, (_, i) => ({
    id: `v${i}`,
    label: defaultLabel(i),
  }));
  const weightOf = (): number =>
    options.weighted ? random.int(options.allowNegativeWeights ? NEGATIVE_WEIGHT_MIN : WEIGHT_MIN, WEIGHT_MAX) : 1;

  const chosen: { readonly from: string; readonly to: string }[] = [];
  const used = new Set<string>();
  const pairKey = (from: string, to: string): string =>
    options.directed ? `${from}\u0000${to}` : [from, to].sort().join('\u0000');
  const take = (from: string, to: string): void => {
    used.add(pairKey(from, to));
    chosen.push({ from, to });
  };

  // 1. Spanning tree first, so the graph is connected whenever that is possible.
  const order = random.shuffle(vertices).map((v) => v.id);
  const treeSize = Math.min(options.edgeCount, Math.max(order.length - 1, 0));
  for (let i = 1; i <= treeSize; i++) {
    const child = order[i]!;
    const parent = order[random.int(0, i - 1)]!;
    take(parent, child);
  }

  // 2. Fill up with edges drawn from the pairs the tree did not use.
  const candidates: { readonly from: string; readonly to: string }[] = [];
  for (const a of vertices) {
    for (const b of vertices) {
      if (a.id === b.id) continue;
      if (!options.directed && a.id > b.id) continue;
      if (used.has(pairKey(a.id, b.id))) continue;
      candidates.push({ from: a.id, to: b.id });
    }
  }
  for (const candidate of random.shuffle(candidates)) {
    if (chosen.length >= options.edgeCount) break;
    if (used.has(pairKey(candidate.from, candidate.to))) continue;
    take(candidate.from, candidate.to);
  }

  // 3. Order edges by their endpoints, so the drawing and tie-breaks read naturally.
  const position = new Map(vertices.map((v, i) => [v.id, i]));
  const sorted = [...chosen].sort(
    (x, y) => position.get(x.from)! - position.get(y.from)! || position.get(x.to)! - position.get(y.to)!,
  );
  const edges: Edge[] = sorted.map((pair, i) => ({ id: `e${i}`, from: pair.from, to: pair.to, weight: weightOf() }));

  return { directed: options.directed, weighted: options.weighted, vertices, edges };
}
