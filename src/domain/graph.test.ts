import { describe, expect, it } from 'vitest';
import { buildGraph } from '../test/graphs';
import {
  EMPTY_GRAPH,
  allArcs,
  findEdge,
  inDegree,
  isWeaklyConnected,
  maxEdgeCount,
  minEdgesToConnect,
  neighbors,
  outDegree,
  reachableFrom,
  setGraphKind,
  validateGraph,
} from './graph';

describe('adjacency', () => {
  it('orders neighbours by vertex declaration order, not edge order', () => {
    const graph = buildGraph({ vertices: 'ABCD', edges: [['A', 'D'], ['A', 'B'], ['C', 'A']] });
    expect(neighbors(graph, 'A')).toEqual(['B', 'C', 'D']);
  });

  it('follows undirected edges from either endpoint and directed edges only forward', () => {
    const undirected = buildGraph({ vertices: 'AB', edges: [['A', 'B']] });
    expect(neighbors(undirected, 'B')).toEqual(['A']);
    const directed = buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B']] });
    expect(neighbors(directed, 'B')).toEqual([]);
    expect(neighbors(directed, 'A')).toEqual(['B']);
  });

  it('allows both orientations between a pair in a directed graph', () => {
    const graph = buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B'], ['B', 'A']] });
    expect(validateGraph(graph)).toEqual([]);
    expect(allArcs(graph)).toHaveLength(2);
    expect(inDegree(graph, 'A')).toBe(1);
    expect(outDegree(graph, 'A')).toBe(1);
  });

  it('yields each undirected edge as two arcs and each directed edge as one', () => {
    expect(allArcs(buildGraph({ vertices: 'AB', edges: [['A', 'B']] }))).toHaveLength(2);
    expect(allArcs(buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B']] }))).toHaveLength(1);
  });

  it('finds an edge regardless of the stored orientation when undirected', () => {
    const graph = buildGraph({ vertices: 'AB', edges: [['A', 'B']] });
    expect(findEdge(graph, 'B', 'A')?.id).toBe('e0');
    const directed = buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B']] });
    expect(findEdge(directed, 'B', 'A')).toBeUndefined();
  });
});

describe('reachability', () => {
  it('covers only the start vertex component and respects direction', () => {
    const graph = buildGraph({ vertices: 'ABCD', edges: [['A', 'B']] });
    expect([...reachableFrom(graph, 'A')].sort()).toEqual(['A', 'B']);
    const chain = buildGraph({ directed: true, vertices: 'ABC', edges: [['A', 'B'], ['C', 'B']] });
    expect([...reachableFrom(chain, 'A')].sort()).toEqual(['A', 'B']);
    expect([...reachableFrom(chain, 'B')]).toEqual(['B']);
  });

  it('treats an empty graph as connected and a split graph as not', () => {
    expect(isWeaklyConnected(EMPTY_GRAPH)).toBe(true);
    expect(isWeaklyConnected(buildGraph({ vertices: 'AB' }))).toBe(false);
    expect(isWeaklyConnected(buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B']] }))).toBe(true);
  });
});

describe('limits', () => {
  it.each([
    [1, false, 0],
    [2, false, 1],
    [4, false, 6],
    [4, true, 12],
  ])('%i vertices, directed=%s → %i edges at most', (count, directed, expected) => {
    expect(maxEdgeCount(count, directed)).toBe(expected);
  });

  it('needs n − 1 edges to connect n vertices', () => {
    expect(minEdgesToConnect(0)).toBe(0);
    expect(minEdgesToConnect(1)).toBe(0);
    expect(minEdgesToConnect(5)).toBe(4);
  });
});

describe('validateGraph', () => {
  it('accepts a simple graph', () => {
    expect(validateGraph(buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 3], ['B', 'C', -2]] }))).toEqual([]);
  });

  it('rejects self-loops, duplicates and unknown endpoints', () => {
    const graph = {
      directed: false,
      weighted: false,
      vertices: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
      edges: [
        { id: 'e0', from: 'A', to: 'A', weight: 1 },
        { id: 'e1', from: 'A', to: 'B', weight: 1 },
        { id: 'e2', from: 'B', to: 'A', weight: 1 },
        { id: 'e3', from: 'A', to: 'Z', weight: 1 },
      ],
    };
    expect(validateGraph(graph).map((p) => p.kind)).toEqual(['selfLoop', 'duplicateEdge', 'unknownEndpoint']);
  });

  it('rejects a weight other than 1 on an unweighted graph', () => {
    const graph = {
      directed: false,
      weighted: false,
      vertices: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
      edges: [{ id: 'e0', from: 'A', to: 'B', weight: 4 }],
    };
    expect(validateGraph(graph).map((p) => p.kind)).toEqual(['unweightedWeight']);
  });
});

describe('setGraphKind', () => {
  it('drops the reverse edge when becoming undirected', () => {
    const graph = buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B'], ['B', 'A']] });
    const undirected = setGraphKind(graph, { directed: false });
    expect(undirected.edges).toHaveLength(1);
    expect(validateGraph(undirected)).toEqual([]);
  });

  it('resets every weight to 1 when becoming unweighted, and keeps them otherwise', () => {
    const graph = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 7], ['B', 'C', -1]] });
    expect(setGraphKind(graph, { weighted: false }).edges.map((e) => e.weight)).toEqual([1, 1]);
    expect(setGraphKind(graph, { directed: true }).edges.map((e) => e.weight)).toEqual([7, -1]);
  });
});
