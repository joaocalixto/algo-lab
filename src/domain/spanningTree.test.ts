import { describe, expect, it } from 'vitest';
import { buildGraph } from '../test/graphs';
import { createUnionFind, kruskal, prim } from './spanningTree';
import { finalStep } from './trace';

/** Weights chosen so the minimum spanning tree is unique: A–B, B–C, B–D, C–E. */
const weighted = buildGraph({
  weighted: true,
  vertices: 'ABCDE',
  edges: [
    ['A', 'B', 1],
    ['A', 'C', 6],
    ['B', 'C', 2],
    ['B', 'D', 3],
    ['C', 'D', 7],
    ['C', 'E', 4],
    ['D', 'E', 9],
  ],
});

function treeOf(graph: typeof weighted, edgeIds: readonly string[]): string[] {
  return edgeIds
    .map((id) => {
      const edge = graph.edges.find((e) => e.id === id)!;
      return `${edge.from}${edge.to}`;
    })
    .sort();
}

describe('union–find', () => {
  it('joins sets once and reports how many remain', () => {
    const sets = createUnionFind(['A', 'B', 'C']);
    expect(sets.setCount()).toBe(3);
    expect(sets.union('A', 'B')).toBe(true);
    expect(sets.union('B', 'A')).toBe(false);
    expect(sets.setCount()).toBe(2);
    expect(sets.find('A')).toBe(sets.find('B'));
    expect(sets.find('C')).not.toBe(sets.find('A'));
  });

  it('keeps one representative per set after chained unions', () => {
    const sets = createUnionFind(['A', 'B', 'C', 'D']);
    sets.union('A', 'B');
    sets.union('C', 'D');
    sets.union('B', 'C');
    expect(new Set(Object.values(sets.roots())).size).toBe(1);
  });
});

describe('Kruskal', () => {
  it('builds the minimum spanning tree and its total weight', () => {
    const trace = kruskal(weighted);
    expect(trace.result.totalWeight).toBe(10);
    expect(treeOf(weighted, trace.result.treeEdges)).toEqual(['AB', 'BC', 'BD', 'CE']);
    expect(trace.result.isSpanningTree).toBe(true);
    expect(trace.result.treeCount).toBe(1);
  });

  it('examines edges from the lightest to the heaviest', () => {
    const considered = kruskal(weighted)
      .steps.filter((s) => s.op === 'consider')
      .map((s) => s.explanation.values!.weight);
    expect(considered).toEqual([...considered].sort((a, b) => Number(a) - Number(b)));
  });

  it('rejects an edge that would close a cycle', () => {
    const graph = buildGraph({
      weighted: true,
      vertices: 'ABCD',
      edges: [['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3], ['C', 'D', 4]],
    });
    const trace = kruskal(graph);
    expect(treeOf(graph, trace.result.treeEdges)).toEqual(['AB', 'BC', 'CD']);
    const rejected = trace.steps.filter((s) => s.op === 'reject');
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.explanation.values).toMatchObject({ from: 'A', to: 'C' });
  });

  it('stops as soon as it holds n − 1 edges', () => {
    const triangle = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 1], ['B', 'C', 1], ['A', 'C', 1]] });
    const trace = kruskal(triangle);
    expect(trace.result.treeEdges).toHaveLength(2);
    expect(trace.steps.filter((s) => s.op === 'consider')).toHaveLength(2);
  });

  it('breaks equal weights by declaration order', () => {
    const tied = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'C', 1], ['A', 'B', 1], ['B', 'C', 1]] });
    expect(treeOf(tied, kruskal(tied).result.treeEdges)).toEqual(['AB', 'AC']);
  });

  it('returns a minimum spanning forest on a disconnected graph and says so', () => {
    const split = buildGraph({ weighted: true, vertices: 'ABCD', edges: [['A', 'B', 2], ['C', 'D', 3]] });
    const trace = kruskal(split);
    expect(trace.result.isSpanningTree).toBe(false);
    expect(trace.result.treeCount).toBe(2);
    expect(trace.result.totalWeight).toBe(5);
    expect(finalStep(trace).notices.map((n) => n.key)).toContain('explorer:notice.spanningForest');
  });

  it('accepts negative weights', () => {
    const graph = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', -5], ['B', 'C', -1], ['A', 'C', 2]] });
    expect(kruskal(graph).result.totalWeight).toBe(-6);
  });

  it('handles an empty graph and a single vertex', () => {
    expect(kruskal(buildGraph({ weighted: true, vertices: '' })).result).toMatchObject({ treeEdges: [], totalWeight: 0, isSpanningTree: false });
    expect(kruskal(buildGraph({ weighted: true, vertices: 'A' })).result).toMatchObject({ totalWeight: 0, isSpanningTree: true });
  });

  it('refuses a directed graph', () => {
    expect(() => kruskal(buildGraph({ directed: true, weighted: true, vertices: 'AB', edges: [['A', 'B', 1]] }))).toThrow();
  });
});

describe('Prim', () => {
  it('finds the same minimum spanning tree as Kruskal', () => {
    const trace = prim(weighted, 'A');
    expect(trace.result.totalWeight).toBe(10);
    expect(treeOf(weighted, trace.result.treeEdges)).toEqual(treeOf(weighted, kruskal(weighted).result.treeEdges));
    expect(trace.result.isSpanningTree).toBe(true);
  });

  it('finds the same tree from any start vertex', () => {
    for (const vertex of weighted.vertices) {
      expect(prim(weighted, vertex.id).result.totalWeight).toBe(10);
    }
  });

  it('breaks equal keys by declaration order', () => {
    const tied = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 1], ['A', 'C', 1], ['B', 'C', 1]] });
    expect(treeOf(tied, prim(tied, 'A').result.treeEdges)).toEqual(['AB', 'AC']);
  });

  it('spans only the start vertex component and reports the rest', () => {
    const split = buildGraph({ weighted: true, vertices: 'ABCD', edges: [['A', 'B', 2], ['C', 'D', 3]] });
    const trace = prim(split, 'A');
    expect(trace.result.totalWeight).toBe(2);
    expect(trace.result.isSpanningTree).toBe(false);
    expect(finalStep(trace).notices.map((n) => n.key)).toContain('explorer:notice.primPartial');
  });

  it('runs on a single vertex with no edges', () => {
    const trace = prim(buildGraph({ weighted: true, vertices: 'A' }), 'A');
    expect(trace.result).toMatchObject({ treeEdges: [], totalWeight: 0, isSpanningTree: true });
  });

  it('refuses a directed graph and an unknown start vertex', () => {
    expect(() => prim(buildGraph({ directed: true, weighted: true, vertices: 'AB', edges: [['A', 'B', 1]] }), 'A')).toThrow();
    expect(() => prim(weighted, 'Z')).toThrow(/start vertex/);
  });
});
