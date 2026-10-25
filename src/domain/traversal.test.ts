import { describe, expect, it } from 'vitest';
import { buildGraph } from '../test/graphs';
import { finalStep } from './trace';
import { connectedComponents, traverse } from './traversal';

/** The classroom example: A–B, A–C, B–D, B–E, C–F, E–F, with G isolated. */
const example = buildGraph({
  vertices: 'ABCDEFG',
  edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['E', 'F']],
});

describe('BFS', () => {
  it('discovers vertices in layers and counts edges to the start', () => {
    const trace = traverse(example, 'A', 'bfs');
    expect(trace.result.discoveryOrder).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(trace.result.hops).toEqual({ A: 0, B: 1, C: 1, D: 2, E: 2, F: 2 });
    expect(finalStep(trace).vertexMarks.G).toBe('undiscovered');
  });

  it('covers only the start vertex component', () => {
    const trace = traverse(example, 'G', 'bfs');
    expect(trace.result.discoveryOrder).toEqual(['G']);
    expect(trace.result.hops).toEqual({ G: 0 });
  });

  it('follows arc direction in a directed graph', () => {
    const graph = buildGraph({ directed: true, vertices: 'ABC', edges: [['A', 'B'], ['C', 'B']] });
    expect(traverse(graph, 'A', 'bfs').result.discoveryOrder).toEqual(['A', 'B']);
    expect(traverse(graph, 'B', 'bfs').result.discoveryOrder).toEqual(['B']);
  });

  it('counts edges, not weights', () => {
    const graph = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 50], ['B', 'C', 1]] });
    expect(traverse(graph, 'A', 'bfs').result.hops).toEqual({ A: 0, B: 1, C: 2 });
  });
});

describe('DFS', () => {
  it('matches the recursive visitation order through a cycle', () => {
    const trace = traverse(example, 'A', 'dfs');
    expect(trace.result.discoveryOrder).toEqual(['A', 'B', 'D', 'E', 'F', 'C']);
    expect(trace.result.finishOrder).toEqual(['D', 'C', 'F', 'E', 'B', 'A']);
    expect(trace.result.hops).toBeUndefined();
  });

  it('ends with an empty frontier and every reached vertex processed', () => {
    const last = finalStep(traverse(example, 'A', 'dfs'));
    expect(last.lists[0]!.items).toEqual([]);
    expect(Object.values(last.vertexMarks).filter((m) => m === 'processed')).toHaveLength(6);
  });
});

describe('traversal traces', () => {
  it.each(['bfs', 'dfs'] as const)('%s: snapshots are independent of later work', (algorithm) => {
    const trace = traverse(example, 'A', algorithm);
    expect(trace.steps[0]!.vertexMarks.B).toBe('undiscovered');
    expect(trace.steps[0]!.lists[1]!.items).toEqual(['A']);
    expect(trace.steps.at(-1)!.op).toBe('complete');
  });

  it.each([
    ['bfs', ['start', 'dequeue', 'finish', 'complete']],
    // DFS discovers and starts processing the start vertex in one operation.
    ['dfs', ['start', 'finish', 'complete']],
  ] as const)('%s: a single vertex produces a complete, minimal run', (algorithm, ops) => {
    const trace = traverse(buildGraph({ vertices: 'A' }), 'A', algorithm);
    expect(trace.result.discoveryOrder).toEqual(['A']);
    expect(trace.result.finishOrder).toEqual(['A']);
    expect(trace.steps.map((s) => s.op)).toEqual([...ops]);
  });

  it('rejects an unknown start vertex', () => {
    expect(() => traverse(example, 'Z', 'bfs')).toThrow(/start vertex/);
  });
});

describe('connected components', () => {
  it('numbers components in declaration order and labels every vertex', () => {
    const graph = buildGraph({ vertices: 'ABCDE', edges: [['A', 'B'], ['C', 'D']] });
    const trace = connectedComponents(graph);
    expect(trace.result.componentCount).toBe(3);
    expect(trace.result.componentOf).toEqual({ A: 1, B: 1, C: 2, D: 2, E: 3 });
    expect(trace.result.components).toEqual([['A', 'B'], ['C', 'D'], ['E']]);
  });

  it('finds one component in a connected graph', () => {
    const trace = connectedComponents(buildGraph({ vertices: 'ABC', edges: [['A', 'B'], ['B', 'C']] }));
    expect(trace.result.componentCount).toBe(1);
    expect(finalStep(trace).vertexBadges).toEqual({ A: '1', B: '1', C: '1' });
  });

  it('handles the empty graph', () => {
    const trace = connectedComponents(buildGraph({ vertices: '' }));
    expect(trace.result).toEqual({ componentOf: {}, componentCount: 0, components: [] });
    expect(trace.steps).toHaveLength(1);
  });

  it('refuses a directed graph, where the procedure computes neither kind of component', () => {
    expect(() => connectedComponents(buildGraph({ directed: true, vertices: 'AB', edges: [['A', 'B']] }))).toThrow();
  });
});
