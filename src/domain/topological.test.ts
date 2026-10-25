import { describe, expect, it } from 'vitest';
import { buildGraph } from '../test/graphs';
import { kahn } from './topological';
import { finalStep } from './trace';

describe("Kahn's algorithm", () => {
  it('orders every vertex after its prerequisites', () => {
    const dag = buildGraph({
      directed: true,
      vertices: 'ABCDE',
      edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E']],
    });
    const trace = kahn(dag);
    expect(trace.result.hasCycle).toBe(false);
    expect(trace.result.order).toEqual(['A', 'B', 'C', 'D', 'E']);
    for (const edge of dag.edges) {
      expect(trace.result.order.indexOf(edge.from)).toBeLessThan(trace.result.order.indexOf(edge.to));
    }
  });

  it('picks among ready vertices in declaration order', () => {
    const dag = buildGraph({ directed: true, vertices: 'CBA', edges: [['C', 'A']] });
    expect(kahn(dag).result.order).toEqual(['C', 'B', 'A']);
  });

  it('numbers the vertices in the order it emits them', () => {
    const dag = buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B']] });
    expect(finalStep(kahn(dag)).vertexBadges).toEqual({ A: '1', B: '2' });
  });

  it('detects a cycle and names the vertices caught in it', () => {
    const cyclic = buildGraph({
      directed: true,
      vertices: 'ABCD',
      edges: [['A', 'B'], ['B', 'C'], ['C', 'B'], ['C', 'D']],
    });
    const trace = kahn(cyclic);
    expect(trace.result.hasCycle).toBe(true);
    expect(trace.result.order).toEqual(['A']);
    expect(trace.result.remaining).toEqual(['B', 'C', 'D']);
    const last = finalStep(trace);
    expect(last.op).toBe('cycleDetected');
    expect(last.notices.map((n) => n.key)).toContain('explorer:notice.cycle');
    // The notice belongs to the step that found the cycle, not to earlier ones.
    expect(trace.steps.slice(0, -1).flatMap((step) => step.notices)).toEqual([]);
  });

  it('orders a graph with no edges by declaration order', () => {
    const trace = kahn(buildGraph({ directed: true, vertices: 'ABC' }));
    expect(trace.result.order).toEqual(['A', 'B', 'C']);
  });

  it('handles the empty graph', () => {
    const trace = kahn(buildGraph({ directed: true, vertices: '' }));
    expect(trace.result).toEqual({ order: [], hasCycle: false, remaining: [] });
    expect(trace.steps).toHaveLength(2);
  });

  it('reports a two-vertex cycle as a cycle, with nothing ordered', () => {
    const trace = kahn(buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B'], ['B', 'A']] }));
    expect(trace.result.hasCycle).toBe(true);
    expect(trace.result.order).toEqual([]);
  });

  it('refuses an undirected graph, where the question does not apply', () => {
    expect(() => kahn(buildGraph({ vertices: 'AB', edges: [['A', 'B']] }))).toThrow(/directed/);
  });
});
