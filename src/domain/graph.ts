/**
 * Graph domain model.
 *
 * Scope: finite simple graphs that may be directed or undirected and weighted
 * or unweighted. One model serves every algorithm in the module; each algorithm
 * declares which kinds of graph it accepts (see `algorithms.ts`).
 *
 * - Undirected: an edge can be followed in both directions. `from`/`to` are only
 *   the stored orientation and carry no meaning; at most one edge may join an
 *   unordered pair {u, v}.
 * - Directed: an edge can be followed from `from` to `to` only. At most one edge
 *   may join an ordered pair (u, v), so u→v and v→u may both exist.
 * - Simple: no self-loops (`from` ≠ `to`).
 * - Unweighted graphs still store a weight, fixed at `UNWEIGHTED_WEIGHT` (1), so
 *   that weight-aware code needs no special case; weights are only *shown* and
 *   only *meaningful* when `weighted` is true.
 *
 * Determinism: every algorithm walks `vertices` and `edges` in declaration order
 * and the adjacency helpers below order arcs by the position of the neighbour in
 * `vertices`, then by the position of the edge in `edges`. Traces are therefore
 * reproducible, and ties are always broken the same way.
 */

/** Stable identifier of a vertex. Never shown to the user; use `Vertex.label`. */
export type VertexId = string;

/** Stable identifier of an edge. Never shown to the user. */
export type EdgeId = string;

export interface Vertex {
  readonly id: VertexId;
  /** Short, language-neutral label drawn inside the vertex (e.g. "A", "7"). */
  readonly label: string;
}

export interface Edge {
  readonly id: EdgeId;
  readonly from: VertexId;
  readonly to: VertexId;
  /** Always 1 in an unweighted graph. May be negative in a weighted graph. */
  readonly weight: number;
}

export interface Graph {
  readonly directed: boolean;
  readonly weighted: boolean;
  /** Declaration order defines deterministic neighbour ordering. */
  readonly vertices: readonly Vertex[];
  readonly edges: readonly Edge[];
}

/** The weight every edge of an unweighted graph carries. */
export const UNWEIGHTED_WEIGHT = 1;

/**
 * Visual layout, kept separate from the graph itself so that algorithm code
 * never depends on presentation. Coordinates are in an abstract viewBox space.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export type GraphLayout = Readonly<Record<VertexId, Point>>;

/** An edge taken in the direction an algorithm follows it. */
export interface Arc {
  readonly edge: Edge;
  readonly from: VertexId;
  readonly to: VertexId;
  readonly weight: number;
}

export const EMPTY_GRAPH: Graph = { directed: false, weighted: false, vertices: [], edges: [] };

export function vertexIds(graph: Graph): readonly VertexId[] {
  return graph.vertices.map((v) => v.id);
}

export function hasVertex(graph: Graph, id: VertexId): boolean {
  return graph.vertices.some((v) => v.id === id);
}

export function vertexLabel(graph: Graph, id: VertexId): string {
  return graph.vertices.find((v) => v.id === id)?.label ?? id;
}

/** Position of each vertex in `vertices`; used to order arcs deterministically. */
export function vertexOrder(graph: Graph): ReadonlyMap<VertexId, number> {
  return new Map(graph.vertices.map((v, i) => [v.id, i]));
}

/**
 * Arcs leaving `id`, ordered by the position of the neighbour in `vertices` and
 * then by the position of the edge in `edges`. In an undirected graph an edge
 * stored as {a, b} yields an arc from either endpoint.
 */
export function outgoingArcs(graph: Graph, id: VertexId): readonly Arc[] {
  const order = vertexOrder(graph);
  const arcs: { readonly arc: Arc; readonly edgeIndex: number }[] = [];
  graph.edges.forEach((edge, edgeIndex) => {
    if (edge.from === id) arcs.push({ arc: { edge, from: id, to: edge.to, weight: edge.weight }, edgeIndex });
    else if (!graph.directed && edge.to === id)
      arcs.push({ arc: { edge, from: id, to: edge.from, weight: edge.weight }, edgeIndex });
  });
  arcs.sort((x, y) => (order.get(x.arc.to) ?? 0) - (order.get(y.arc.to) ?? 0) || x.edgeIndex - y.edgeIndex);
  return arcs.map((entry) => entry.arc);
}

/** Every arc of the graph, in edge declaration order (both directions when undirected). */
export function allArcs(graph: Graph): readonly Arc[] {
  const arcs: Arc[] = [];
  for (const edge of graph.edges) {
    arcs.push({ edge, from: edge.from, to: edge.to, weight: edge.weight });
    if (!graph.directed) arcs.push({ edge, from: edge.to, to: edge.from, weight: edge.weight });
  }
  return arcs;
}

export function neighbors(graph: Graph, id: VertexId): readonly VertexId[] {
  return outgoingArcs(graph, id).map((arc) => arc.to);
}

/** The edge joining the two vertices, respecting direction in a directed graph. */
export function findEdge(graph: Graph, from: VertexId, to: VertexId): Edge | undefined {
  return graph.edges.find((e) =>
    graph.directed ? e.from === from && e.to === to : (e.from === from && e.to === to) || (e.from === to && e.to === from),
  );
}

export function inDegree(graph: Graph, id: VertexId): number {
  if (!graph.directed) return outgoingArcs(graph, id).length;
  return graph.edges.filter((e) => e.to === id).length;
}

export function outDegree(graph: Graph, id: VertexId): number {
  return outgoingArcs(graph, id).length;
}

/** Largest number of edges a simple graph with `vertexCount` vertices can hold. */
export function maxEdgeCount(vertexCount: number, directed: boolean): number {
  if (vertexCount < 2) return 0;
  const pairs = (vertexCount * (vertexCount - 1)) / 2;
  return directed ? pairs * 2 : pairs;
}

/** Fewest edges that can connect every vertex (a spanning tree). */
export function minEdgesToConnect(vertexCount: number): number {
  return vertexCount < 2 ? 0 : vertexCount - 1;
}

/**
 * Vertices reachable from `id` by following arcs. In an undirected graph this is
 * the connected component; in a directed graph it ignores arcs pointing the
 * wrong way, so it is not symmetric.
 */
export function reachableFrom(graph: Graph, id: VertexId): ReadonlySet<VertexId> {
  const seen = new Set<VertexId>([id]);
  const pending: VertexId[] = [id];
  while (pending.length > 0) {
    const current = pending.shift()!;
    for (const arc of outgoingArcs(graph, current)) {
      if (!seen.has(arc.to)) {
        seen.add(arc.to);
        pending.push(arc.to);
      }
    }
  }
  return seen;
}

/** True when every vertex is reachable from every other, ignoring direction. */
export function isWeaklyConnected(graph: Graph): boolean {
  const first = graph.vertices[0];
  if (!first) return true;
  const undirected: Graph = { ...graph, directed: false };
  return reachableFrom(undirected, first.id).size === graph.vertices.length;
}

export function hasNegativeWeight(graph: Graph): boolean {
  return graph.weighted && graph.edges.some((e) => e.weight < 0);
}

/** A structural problem that makes a graph invalid. */
export type GraphProblem =
  | { readonly kind: 'duplicateVertexId'; readonly vertex: VertexId }
  | { readonly kind: 'unknownEndpoint'; readonly edge: EdgeId }
  | { readonly kind: 'selfLoop'; readonly edge: EdgeId }
  | { readonly kind: 'duplicateEdge'; readonly edge: EdgeId }
  | { readonly kind: 'duplicateEdgeId'; readonly edge: EdgeId }
  | { readonly kind: 'nonFiniteWeight'; readonly edge: EdgeId }
  | { readonly kind: 'unweightedWeight'; readonly edge: EdgeId };

/** Checks the invariants documented at the top of this module. */
export function validateGraph(graph: Graph): readonly GraphProblem[] {
  const problems: GraphProblem[] = [];
  const seenVertices = new Set<VertexId>();
  for (const vertex of graph.vertices) {
    if (seenVertices.has(vertex.id)) problems.push({ kind: 'duplicateVertexId', vertex: vertex.id });
    seenVertices.add(vertex.id);
  }
  const seenEdgeIds = new Set<EdgeId>();
  const seenPairs = new Set<string>();
  for (const edge of graph.edges) {
    if (seenEdgeIds.has(edge.id)) problems.push({ kind: 'duplicateEdgeId', edge: edge.id });
    seenEdgeIds.add(edge.id);
    if (!seenVertices.has(edge.from) || !seenVertices.has(edge.to)) {
      problems.push({ kind: 'unknownEndpoint', edge: edge.id });
      continue;
    }
    if (edge.from === edge.to) problems.push({ kind: 'selfLoop', edge: edge.id });
    const pair = graph.directed ? `${edge.from}\u0000${edge.to}` : [edge.from, edge.to].sort().join('\u0000');
    if (seenPairs.has(pair)) problems.push({ kind: 'duplicateEdge', edge: edge.id });
    seenPairs.add(pair);
    if (!Number.isFinite(edge.weight)) problems.push({ kind: 'nonFiniteWeight', edge: edge.id });
    else if (!graph.weighted && edge.weight !== UNWEIGHTED_WEIGHT) problems.push({ kind: 'unweightedWeight', edge: edge.id });
  }
  return problems;
}

/** Throws on any structural problem. Engines call this before running. */
export function assertValidGraph(graph: Graph): void {
  const problems = validateGraph(graph);
  if (problems.length > 0) throw new Error(`Invalid graph: ${problems.map((p) => `${p.kind}`).join(', ')}`);
}

/**
 * Turns a graph into the given kind, keeping as much of it as possible:
 * switching to undirected drops the second edge of a u→v / v→u pair, and
 * switching to unweighted resets every weight to `UNWEIGHTED_WEIGHT`.
 */
export function setGraphKind(graph: Graph, kind: { readonly directed?: boolean; readonly weighted?: boolean }): Graph {
  const directed = kind.directed ?? graph.directed;
  const weighted = kind.weighted ?? graph.weighted;
  const kept: Edge[] = [];
  const seenPairs = new Set<string>();
  for (const edge of graph.edges) {
    const pair = directed ? `${edge.from}\u0000${edge.to}` : [edge.from, edge.to].sort().join('\u0000');
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    kept.push(weighted ? edge : { ...edge, weight: UNWEIGHTED_WEIGHT });
  }
  return { directed, weighted, vertices: graph.vertices, edges: kept };
}
