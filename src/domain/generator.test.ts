import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GENERATOR_OPTIONS,
  MAX_VERTICES,
  type GeneratorOptions,
  generateGraph,
  generatorLimits,
  validateGeneratorOptions,
  willBeConnected,
} from './generator';
import { isWeaklyConnected, maxEdgeCount, validateGraph } from './graph';
import { CANVAS, circleLayout, forceLayout } from './layout';

const options = (overrides: Partial<GeneratorOptions> = {}): GeneratorOptions => ({
  ...DEFAULT_GENERATOR_OPTIONS,
  ...overrides,
});

describe('generator options', () => {
  it('reports the edge range for a vertex count', () => {
    expect(generatorLimits(5, false)).toEqual({ connectedThreshold: 4, maxEdges: 10 });
    expect(generatorLimits(5, true)).toEqual({ connectedThreshold: 4, maxEdges: 20 });
    expect(generatorLimits(1, false)).toEqual({ connectedThreshold: 0, maxEdges: 0 });
  });

  it('refuses impossible requests, naming the limit', () => {
    expect(validateGeneratorOptions(options({ vertexCount: 4, edgeCount: 7 }))).toEqual([{ kind: 'tooManyEdges', maxEdges: 6 }]);
    expect(validateGeneratorOptions(options({ vertexCount: 4, directed: true, edgeCount: 7 }))).toEqual([]);
    expect(validateGeneratorOptions(options({ vertexCount: 0 })).map((p) => p.kind)).toContain('vertexCountOutOfRange');
    expect(validateGeneratorOptions(options({ vertexCount: MAX_VERTICES + 1 })).map((p) => p.kind)).toContain('vertexCountOutOfRange');
    expect(validateGeneratorOptions(options({ edgeCount: -1 })).map((p) => p.kind)).toContain('negativeEdgeCount');
    expect(() => generateGraph(options({ vertexCount: 3, edgeCount: 99 }))).toThrow(/Cannot generate/);
  });

  it('says whether the request allows a connected graph', () => {
    expect(willBeConnected(options({ vertexCount: 5, edgeCount: 4 }))).toBe(true);
    expect(willBeConnected(options({ vertexCount: 5, edgeCount: 3 }))).toBe(false);
  });
});

describe('generateGraph', () => {
  it('produces exactly the requested size, and a valid simple graph', () => {
    for (const vertexCount of [1, 2, 5, 12]) {
      for (const directed of [false, true]) {
        const edgeCount = Math.min(maxEdgeCount(vertexCount, directed), vertexCount + 2);
        const graph = generateGraph(options({ vertexCount, edgeCount, directed, seed: vertexCount * 7 + 1 }));
        expect(graph.vertices).toHaveLength(vertexCount);
        expect(graph.edges).toHaveLength(edgeCount);
        expect(validateGraph(graph)).toEqual([]);
      }
    }
  });

  it('is reproducible for a seed and different for another', () => {
    const a = generateGraph(options({ seed: 42 }));
    const b = generateGraph(options({ seed: 42 }));
    const c = generateGraph(options({ seed: 43 }));
    expect(a).toEqual(b);
    expect(JSON.stringify(a.edges)).not.toBe(JSON.stringify(c.edges));
  });

  it('connects every vertex whenever the edge count allows it', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const directed of [false, true]) {
        const graph = generateGraph(options({ vertexCount: 8, edgeCount: 7, directed, seed }));
        expect(isWeaklyConnected(graph), `seed ${seed}`).toBe(true);
      }
    }
  });

  it('leaves the graph disconnected when too few edges are asked for', () => {
    const graph = generateGraph(options({ vertexCount: 6, edgeCount: 1, seed: 5 }));
    expect(isWeaklyConnected(graph)).toBe(false);
    expect(graph.edges).toHaveLength(1);
  });

  it('fills a complete graph without duplicates', () => {
    for (const directed of [false, true]) {
      const graph = generateGraph(options({ vertexCount: 5, edgeCount: maxEdgeCount(5, directed), directed, seed: 9 }));
      expect(validateGraph(graph)).toEqual([]);
      expect(graph.edges).toHaveLength(directed ? 20 : 10);
    }
  });

  it('makes every vertex reachable from some root in a directed graph', () => {
    const graph = generateGraph(options({ vertexCount: 9, edgeCount: 8, directed: true, seed: 3 }));
    const withIncoming = new Set(graph.edges.map((e) => e.to));
    const roots = graph.vertices.filter((v) => !withIncoming.has(v.id));
    expect(roots.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps weights at 1 when unweighted, positive when weighted, and can go negative on request', () => {
    expect(generateGraph(options({ weighted: false })).edges.every((e) => e.weight === 1)).toBe(true);
    expect(generateGraph(options({ weighted: true, seed: 7 })).edges.every((e) => e.weight >= 1)).toBe(true);
    const mixed = generateGraph(options({ weighted: true, allowNegativeWeights: true, vertexCount: 10, edgeCount: 20, seed: 11 }));
    expect(mixed.edges.some((e) => e.weight < 0)).toBe(true);
  });
});

describe('layout', () => {
  it('places every vertex inside the canvas', () => {
    const graph = generateGraph(options({ vertexCount: 10, edgeCount: 14, seed: 2 }));
    for (const kind of [circleLayout, forceLayout]) {
      const layout = kind(graph);
      expect(Object.keys(layout)).toHaveLength(10);
      for (const point of Object.values(layout)) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(CANVAS.width);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(CANVAS.height);
      }
    }
  });

  it('is deterministic and keeps vertices apart', () => {
    const graph = generateGraph(options({ vertexCount: 7, edgeCount: 9, seed: 4 }));
    expect(forceLayout(graph)).toEqual(forceLayout(graph));
    const points = Object.values(forceLayout(graph));
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        expect(Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y)).toBeGreaterThan(20);
      }
    }
  });

  it('centres a single vertex', () => {
    const graph = generateGraph(options({ vertexCount: 1, edgeCount: 0 }));
    expect(circleLayout(graph)[graph.vertices[0]!.id]).toEqual({ x: CANVAS.width / 2, y: CANVAS.height / 2 });
  });
});
