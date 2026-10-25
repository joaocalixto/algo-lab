/**
 * Algorithm registry: what each algorithm needs from a graph, and how to run it.
 *
 * Prerequisites are data, not code sprinkled through the UI, so the interface
 * can always say *why* an algorithm does not apply to the graph on screen
 * instead of hiding it. They are genuine correctness requirements:
 *
 * - directed / undirected: the question the algorithm answers only exists for
 *   that kind of graph (a topological order needs arcs to point somewhere; a
 *   spanning tree has no orientation).
 * - weighted: the algorithm compares weights, so on an unweighted graph it
 *   would just repeat what BFS already shows more clearly.
 * - nonNegativeWeights: Dijkstra settles a vertex for good, which a negative
 *   weight can contradict. Bellman–Ford is the algorithm for that case.
 * - nonEmpty: there is nothing to run on a graph with no vertices.
 *
 * An algorithm that needs a start vertex says so, and the UI asks for one.
 */

import { type Graph, type VertexId, hasNegativeWeight } from './graph';
import { dijkstra, bellmanFord, floydWarshall } from './shortestPaths';
import { kruskal, prim } from './spanningTree';
import { kahn } from './topological';
import { connectedComponents, traverse } from './traversal';
import type { AlgorithmId, AlgorithmTrace } from './trace';

export type PrerequisiteKind = 'nonEmpty' | 'directed' | 'undirected' | 'weighted' | 'nonNegativeWeights';

/** Groups the algorithms in the picker; also the heading of each group. */
export type AlgorithmFamily = 'traversal' | 'shortestPath' | 'spanningTree' | 'ordering';

export interface AlgorithmDefinition {
  readonly id: AlgorithmId;
  readonly family: AlgorithmFamily;
  readonly needsStartVertex: boolean;
  readonly prerequisites: readonly PrerequisiteKind[];
  readonly run: (graph: Graph, startVertex: VertexId | null) => AlgorithmTrace;
}

function requireStart(id: AlgorithmId, startVertex: VertexId | null): VertexId {
  if (startVertex === null) throw new Error(`${id} needs a start vertex`);
  return startVertex;
}

export const ALGORITHMS: readonly AlgorithmDefinition[] = [
  {
    id: 'bfs',
    family: 'traversal',
    needsStartVertex: true,
    prerequisites: ['nonEmpty'],
    run: (graph, start) => traverse(graph, requireStart('bfs', start), 'bfs'),
  },
  {
    id: 'dfs',
    family: 'traversal',
    needsStartVertex: true,
    prerequisites: ['nonEmpty'],
    run: (graph, start) => traverse(graph, requireStart('dfs', start), 'dfs'),
  },
  {
    id: 'components',
    family: 'traversal',
    needsStartVertex: false,
    prerequisites: ['nonEmpty', 'undirected'],
    run: (graph) => connectedComponents(graph),
  },
  {
    id: 'dijkstra',
    family: 'shortestPath',
    needsStartVertex: true,
    prerequisites: ['nonEmpty', 'weighted', 'nonNegativeWeights'],
    run: (graph, start) => dijkstra(graph, requireStart('dijkstra', start)),
  },
  {
    id: 'bellmanFord',
    family: 'shortestPath',
    needsStartVertex: true,
    prerequisites: ['nonEmpty', 'weighted', 'directed'],
    run: (graph, start) => bellmanFord(graph, requireStart('bellmanFord', start)),
  },
  {
    id: 'floydWarshall',
    family: 'shortestPath',
    needsStartVertex: false,
    prerequisites: ['nonEmpty', 'weighted', 'directed'],
    run: (graph) => floydWarshall(graph),
  },
  {
    id: 'kruskal',
    family: 'spanningTree',
    needsStartVertex: false,
    prerequisites: ['nonEmpty', 'undirected', 'weighted'],
    run: (graph) => kruskal(graph),
  },
  {
    id: 'prim',
    family: 'spanningTree',
    needsStartVertex: true,
    prerequisites: ['nonEmpty', 'undirected', 'weighted'],
    run: (graph, start) => prim(graph, requireStart('prim', start)),
  },
  {
    id: 'kahn',
    family: 'ordering',
    needsStartVertex: false,
    prerequisites: ['nonEmpty', 'directed'],
    run: (graph) => kahn(graph),
  },
];

export const ALGORITHM_FAMILIES: readonly AlgorithmFamily[] = ['traversal', 'shortestPath', 'spanningTree', 'ordering'];

export function getAlgorithm(id: AlgorithmId): AlgorithmDefinition {
  const definition = ALGORITHMS.find((a) => a.id === id);
  if (!definition) throw new Error(`Unknown algorithm: ${id}`);
  return definition;
}

function isMet(kind: PrerequisiteKind, graph: Graph): boolean {
  switch (kind) {
    case 'nonEmpty':
      return graph.vertices.length > 0;
    case 'directed':
      return graph.directed;
    case 'undirected':
      return !graph.directed;
    case 'weighted':
      return graph.weighted;
    case 'nonNegativeWeights':
      return !hasNegativeWeight(graph);
  }
}

/** The prerequisites this graph fails, in declaration order. */
export function unmetPrerequisites(definition: AlgorithmDefinition, graph: Graph): readonly PrerequisiteKind[] {
  return definition.prerequisites.filter((kind) => !isMet(kind, graph));
}

export function isApplicable(definition: AlgorithmDefinition, graph: Graph): boolean {
  return unmetPrerequisites(definition, graph).length === 0;
}

/** Runs an algorithm; throws if its prerequisites are not met. */
export function runAlgorithm(id: AlgorithmId, graph: Graph, startVertex: VertexId | null): AlgorithmTrace {
  const definition = getAlgorithm(id);
  const unmet = unmetPrerequisites(definition, graph);
  if (unmet.length > 0) throw new Error(`${id} cannot run on this graph: ${unmet.join(', ')}`);
  return definition.run(graph, startVertex);
}
