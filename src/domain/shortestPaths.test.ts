import { describe, expect, it } from 'vitest';
import { buildGraph } from '../test/graphs';
import { bellmanFord, dijkstra, floydWarshall, reconstructPath } from './shortestPaths';
import { finalStep } from './trace';

const classic = buildGraph({
  directed: true,
  weighted: true,
  vertices: 'ABCDE',
  edges: [
    ['A', 'B', 4],
    ['A', 'C', 2],
    ['B', 'D', 5],
    ['C', 'B', 1],
    ['C', 'D', 8],
    ['C', 'E', 10],
    ['D', 'E', 2],
  ],
});

describe('Dijkstra', () => {
  it('finds the shortest distances and the tree that produced them', () => {
    const trace = dijkstra(classic, 'A');
    expect(trace.result.distance).toEqual({ A: 0, B: 3, C: 2, D: 8, E: 10 });
    expect(trace.result.previous).toEqual({ A: null, B: 'C', C: 'A', D: 'B', E: 'D' });
    expect(reconstructPath(trace.result, 'A', 'E')).toEqual(['A', 'C', 'B', 'D', 'E']);
  });

  it('settles vertices in order of distance', () => {
    expect(dijkstra(classic, 'A').result.settledOrder).toEqual(['A', 'C', 'B', 'D', 'E']);
  });

  it('breaks distance ties by declaration order', () => {
    const tied = buildGraph({
      directed: true,
      weighted: true,
      vertices: 'ABCD',
      edges: [['A', 'B', 5], ['A', 'C', 5], ['B', 'D', 1], ['C', 'D', 1]],
    });
    const trace = dijkstra(tied, 'A');
    expect(trace.result.settledOrder).toEqual(['A', 'B', 'C', 'D']);
    expect(trace.result.previous.D).toBe('B');
  });

  it('leaves unreachable vertices at infinity', () => {
    const trace = dijkstra(classic, 'D');
    expect(trace.result.distance).toEqual({ A: Infinity, B: Infinity, C: Infinity, D: 0, E: 2 });
    expect(reconstructPath(trace.result, 'D', 'A')).toBeNull();
    expect(finalStep(trace).vertexMarks.A).toBe('undiscovered');
  });

  it('works on an undirected graph and on zero weights', () => {
    const graph = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 0], ['B', 'C', 3]] });
    expect(dijkstra(graph, 'C').result.distance).toEqual({ A: 3, B: 3, C: 0 });
  });

  it('refuses negative weights instead of returning a wrong answer', () => {
    const graph = buildGraph({ directed: true, weighted: true, vertices: 'ABC', edges: [['A', 'B', 2], ['B', 'C', -4]] });
    expect(() => dijkstra(graph, 'A')).toThrow(/non-negative/);
  });

  it('runs on a single vertex', () => {
    const trace = dijkstra(buildGraph({ weighted: true, vertices: 'A' }), 'A');
    expect(trace.result.distance).toEqual({ A: 0 });
    expect(trace.steps.at(-1)!.op).toBe('complete');
  });
});

describe('Bellman–Ford', () => {
  it('agrees with Dijkstra when every weight is non-negative', () => {
    expect(bellmanFord(classic, 'A').result.distance).toEqual(dijkstra(classic, 'A').result.distance);
  });

  it('handles negative weights that Dijkstra cannot', () => {
    const graph = buildGraph({
      directed: true,
      weighted: true,
      vertices: 'ABCD',
      edges: [['A', 'B', 4], ['A', 'C', 5], ['B', 'C', -3], ['C', 'D', 2]],
    });
    const trace = bellmanFord(graph, 'A');
    expect(trace.result.negativeCycle).toBe(false);
    expect(trace.result.distance).toEqual({ A: 0, B: 4, C: 1, D: 3 });
    expect(reconstructPath(trace.result, 'A', 'D')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('detects a reachable negative cycle and stops', () => {
    const graph = buildGraph({
      directed: true,
      weighted: true,
      vertices: 'ABCD',
      edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'B', -3], ['C', 'D', 2]],
    });
    const trace = bellmanFord(graph, 'A');
    expect(trace.result.negativeCycle).toBe(true);
    const last = finalStep(trace);
    expect(last.op).toBe('negativeCycle');
    expect(last.notices.map((n) => n.key)).toContain('explorer:notice.negativeCycle');
    expect(reconstructPath(trace.result, 'A', 'D')).toBeNull();
  });

  it('ignores a negative cycle that cannot be reached from the start', () => {
    const graph = buildGraph({
      directed: true,
      weighted: true,
      vertices: 'ABCD',
      edges: [['A', 'B', 1], ['C', 'D', -2], ['D', 'C', -2]],
    });
    const trace = bellmanFord(graph, 'A');
    expect(trace.result.negativeCycle).toBe(false);
    expect(trace.result.distance).toEqual({ A: 0, B: 1, C: Infinity, D: Infinity });
  });

  it('stops early when a pass changes nothing', () => {
    const graph = buildGraph({ directed: true, weighted: true, vertices: 'ABCDE', edges: [['A', 'B', 1], ['B', 'C', 1]] });
    const trace = bellmanFord(graph, 'A');
    expect(trace.result.passes).toBeLessThan(graph.vertices.length - 1);
    expect(trace.steps.some((s) => s.explanation.key.endsWith('settledEarly'))).toBe(true);
  });

  it('runs on a graph with no edges', () => {
    const trace = bellmanFord(buildGraph({ directed: true, weighted: true, vertices: 'AB' }), 'A');
    expect(trace.result.distance).toEqual({ A: 0, B: Infinity });
  });
});

describe('Floyd–Warshall', () => {
  it('computes every pair of distances', () => {
    const trace = floydWarshall(classic);
    expect(trace.result.distance.A).toEqual({ A: 0, B: 3, C: 2, D: 8, E: 10 });
    expect(trace.result.distance.C).toEqual({ A: Infinity, B: 1, C: 0, D: 6, E: 8 });
    expect(trace.result.distance.E).toEqual({ A: Infinity, B: Infinity, C: Infinity, D: Infinity, E: 0 });
    expect(trace.result.negativeCycleVertices).toEqual([]);
  });

  it('agrees with Dijkstra from every start vertex', () => {
    const all = floydWarshall(classic).result.distance;
    for (const vertex of classic.vertices) {
      expect(all[vertex.id]).toEqual(dijkstra(classic, vertex.id).result.distance);
    }
  });

  it('marks the vertices of a negative cycle on the diagonal', () => {
    const graph = buildGraph({
      directed: true,
      weighted: true,
      vertices: 'ABC',
      edges: [['A', 'B', 1], ['B', 'C', -3], ['C', 'B', 1]],
    });
    const trace = floydWarshall(graph);
    expect([...trace.result.negativeCycleVertices].sort()).toEqual(['B', 'C']);
    expect(finalStep(trace).notices.map((n) => n.key)).toContain('explorer:notice.negativeCycleVertices');
  });

  it('shows the matrix evolving, ending with the final distances', () => {
    const trace = floydWarshall(classic);
    const first = trace.steps[0]!.tables[0]!;
    expect(first.columns.map((c) => (c.kind === 'text' ? c.text : ''))).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(first.rows[0]!.cells[3]).toEqual({ kind: 'infinity' });
    expect(finalStep(trace).tables[0]!.rows[0]!.cells[3]).toEqual({ kind: 'number', value: 8 });
  });

  it('handles an empty graph and a single vertex', () => {
    expect(floydWarshall(buildGraph({ directed: true, weighted: true, vertices: '' })).result.distance).toEqual({});
    expect(floydWarshall(buildGraph({ directed: true, weighted: true, vertices: 'A' })).result.distance).toEqual({ A: { A: 0 } });
  });
});
