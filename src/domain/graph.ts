/**
 * Graph domain model.
 *
 * Scope (Milestone 1–3): finite, undirected, unweighted, simple graphs.
 * - Undirected: edge {u, v} can be followed in both directions.
 * - Simple: no self-loops (u ≠ v) and at most one edge per unordered pair.
 *
 * Neighbor ordering is deterministic: the neighbors of a vertex are ordered by
 * the position of each neighbor in `Graph.vertices` (declaration order). Example
 * graphs therefore control traversal order explicitly, independent of how
 * `edges` happens to be listed.
 */

/** Stable identifier of a vertex. Never shown to the user; use `Vertex.label`. */
export type VertexId = string;

export interface Vertex {
  readonly id: VertexId;
  /** Short, language-neutral label drawn inside the vertex (e.g. "A", "7"). */
  readonly label: string;
}

/** Undirected edge. The pair is unordered: {a, b} and {b, a} are the same edge. */
export interface Edge {
  readonly a: VertexId;
  readonly b: VertexId;
}

export interface Graph {
  /** Declaration order defines deterministic neighbor ordering. */
  readonly vertices: readonly Vertex[];
  readonly edges: readonly Edge[];
}

/**
 * Visual layout, kept separate from the graph itself so that algorithm code
 * never depends on presentation. Coordinates are in an abstract viewBox space.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export type GraphLayout = Readonly<Record<VertexId, Point>>;
