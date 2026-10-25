import { describe, expect, it } from 'vitest';
import { buildGraph } from '../test/graphs';
import { ALGORITHMS, getAlgorithm, isApplicable, runAlgorithm, unmetPrerequisites } from './algorithms';
import { EMPTY_GRAPH } from './graph';

const undirectedWeighted = buildGraph({ weighted: true, vertices: 'ABC', edges: [['A', 'B', 2], ['B', 'C', 3]] });
const directedWeighted = buildGraph({ directed: true, weighted: true, vertices: 'ABC', edges: [['A', 'B', 2], ['B', 'C', 3]] });
const directedNegative = buildGraph({ directed: true, weighted: true, vertices: 'ABC', edges: [['A', 'B', -2], ['B', 'C', 3]] });
const undirectedPlain = buildGraph({ vertices: 'ABC', edges: [['A', 'B'], ['B', 'C']] });

describe('registry', () => {
  it('covers the nine algorithms of the module exactly once', () => {
    expect(ALGORITHMS.map((a) => a.id)).toEqual([
      'bfs',
      'dfs',
      'components',
      'dijkstra',
      'bellmanFord',
      'floydWarshall',
      'kruskal',
      'prim',
      'kahn',
    ]);
    expect(new Set(ALGORITHMS.map((a) => a.id)).size).toBe(ALGORITHMS.length);
  });

  it('throws on an unknown id', () => {
    // @ts-expect-error unknown ids are a programming error, guarded at runtime.
    expect(() => getAlgorithm('nope')).toThrow(/Unknown algorithm/);
  });
});

describe('prerequisites', () => {
  it.each([
    ['bfs', undirectedPlain, []],
    ['dfs', directedWeighted, []],
    ['components', directedWeighted, ['undirected']],
    ['dijkstra', undirectedPlain, ['weighted']],
    ['dijkstra', directedNegative, ['nonNegativeWeights']],
    ['dijkstra', undirectedWeighted, []],
    ['bellmanFord', undirectedWeighted, ['directed']],
    ['bellmanFord', directedNegative, []],
    ['floydWarshall', undirectedPlain, ['weighted', 'directed']],
    ['kruskal', directedWeighted, ['undirected']],
    ['prim', undirectedPlain, ['weighted']],
    ['prim', undirectedWeighted, []],
    ['kahn', undirectedPlain, ['directed']],
    ['kahn', directedWeighted, []],
  ] as const)('%s on this graph is missing %j', (id, graph, expected) => {
    expect(unmetPrerequisites(getAlgorithm(id), graph)).toEqual([...expected]);
  });

  it('declares nothing applicable to an empty graph', () => {
    for (const definition of ALGORITHMS) {
      expect(unmetPrerequisites(definition, EMPTY_GRAPH)).toContain('nonEmpty');
      expect(isApplicable(definition, EMPTY_GRAPH)).toBe(false);
    }
  });
});

describe('runAlgorithm', () => {
  it('runs every applicable algorithm over the same graph and always produces steps', () => {
    for (const definition of ALGORITHMS) {
      const graph = definition.prerequisites.includes('directed') ? directedWeighted : undirectedWeighted;
      if (!isApplicable(definition, graph)) continue;
      const trace = runAlgorithm(definition.id, graph, definition.needsStartVertex ? 'A' : null);
      expect(trace.algorithm, definition.id).toBe(definition.id);
      expect(trace.steps.length, definition.id).toBeGreaterThan(0);
      expect(trace.steps.map((s) => s.index)).toEqual(trace.steps.map((_, i) => i));
      for (const step of trace.steps) expect(step.explanation.key).toMatch(/^explorer:steps\./);
    }
  });

  it('refuses to run when a prerequisite is unmet', () => {
    expect(() => runAlgorithm('kahn', undirectedWeighted, null)).toThrow(/cannot run/);
    expect(() => runAlgorithm('dijkstra', directedNegative, 'A')).toThrow(/cannot run/);
  });

  it('demands a start vertex when the algorithm needs one', () => {
    expect(() => runAlgorithm('bfs', undirectedWeighted, null)).toThrow(/start vertex/);
  });
});
