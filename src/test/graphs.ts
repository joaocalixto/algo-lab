/** Test-only helpers for writing small graphs by hand. */

import type { Edge, Graph, Vertex } from '../domain/graph';

export interface GraphSpec {
  readonly directed?: boolean;
  readonly weighted?: boolean;
  /** One label per vertex, e.g. "ABCD". Declaration order = tie-break order. */
  readonly vertices: string;
  /** `[from, to]` or `[from, to, weight]`, by label, in declaration order. */
  readonly edges?: readonly (readonly [string, string] | readonly [string, string, number])[];
}

/** Vertex ids are the labels themselves, which keeps assertions readable. */
export function buildGraph(spec: GraphSpec): Graph {
  const vertices: Vertex[] = [...spec.vertices].map((label) => ({ id: label, label }));
  const weighted = spec.weighted ?? false;
  const edges: Edge[] = (spec.edges ?? []).map((edge, i) => ({
    id: `e${i}`,
    from: edge[0],
    to: edge[1],
    weight: weighted ? (edge[2] ?? 1) : 1,
  }));
  return { directed: spec.directed ?? false, weighted, vertices, edges };
}

/** Labels of an id list, for readable expectations. */
export function labels(ids: readonly string[]): string[] {
  return [...ids];
}
