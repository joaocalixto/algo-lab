/**
 * Graph traversal: BFS, DFS, and connected components.
 *
 * Vertex marks (see `trace.ts` for the shared four-state lifecycle):
 *
 * - BFS: a vertex becomes `discovered` when it is enqueued (marking on enqueue
 *   is what prevents duplicates in the queue), `processing` when dequeued, and
 *   `processed` once all its neighbours have been examined.
 *
 * - DFS (iterative, explicit stack of frames): the stack holds the vertices
 *   whose examination has started and not finished — exactly the recursion
 *   stack of recursive DFS. Each frame remembers the next neighbour to examine.
 *   Pushing a vertex discovers it and starts its processing in the same
 *   operation, so in DFS a vertex passes through `discovered` instantaneously;
 *   it becomes `processed` when its frame is popped. This reproduces the
 *   recursive DFS visitation order for the given neighbour ordering. (The
 *   common variant that pushes all neighbours at once produces a different
 *   order and is NOT what is modelled.)
 *
 * A single traversal covers only the vertices reachable from the start vertex:
 * its connected component in an undirected graph, and the set reachable by
 * following arcs in a directed one. It never restarts elsewhere. The
 * `components` algorithm is the one that does restart, once per component.
 *
 * Neighbour order is the deterministic arc order of `graph.ts`: by the position
 * of the neighbour in `graph.vertices`.
 *
 * BFS distances count edges, not weights. They are shortest-path distances only
 * in an unweighted graph; in a weighted graph they are reported as hop counts
 * and the shortest-path engines are the ones to use.
 */

import {
  type EdgeId,
  type Graph,
  type VertexId,
  assertValidGraph,
  hasVertex,
  outgoingArcs,
  vertexLabel,
} from './graph';
import { createRecorder } from './recorder';
import {
  type AlgorithmTrace,
  type EdgeMark,
  type StepList,
  type StepTable,
  type VertexMark,
  cellDistance,
  cellLabel,
  headerKey,
  headerText,
} from './trace';

export type TraversalAlgorithm = 'bfs' | 'dfs';

/** BFS uses a FIFO queue; iterative DFS uses an explicit LIFO stack. */
export type FrontierKind = 'queue' | 'stack';

export const FRONTIER_KIND: Readonly<Record<TraversalAlgorithm, FrontierKind>> = {
  bfs: 'queue',
  dfs: 'stack',
};

export interface TraversalResult {
  /** Vertices in the order the traversal first reached them. */
  readonly discoveryOrder: readonly VertexId[];
  /** Vertices in the order their examination finished. */
  readonly finishOrder: readonly VertexId[];
  /** Traversal-tree parent; `null` for a root; absent while undiscovered. */
  readonly parent: Readonly<Record<VertexId, VertexId | null>>;
  /** BFS only: number of edges from the start vertex. */
  readonly hops?: Readonly<Record<VertexId, number>>;
}

export interface ComponentsResult {
  /** 1-based component number per vertex, numbered in discovery order. */
  readonly componentOf: Readonly<Record<VertexId, number>>;
  readonly componentCount: number;
  /** The vertices of each component, in discovery order. */
  readonly components: readonly (readonly VertexId[])[];
}

export function traverse(graph: Graph, start: VertexId, algorithm: TraversalAlgorithm): AlgorithmTrace<TraversalResult> {
  assertValidGraph(graph);
  if (!hasVertex(graph, start)) throw new Error(`Unknown start vertex: ${start}`);

  const label = (id: VertexId): string => vertexLabel(graph, id);
  const marks: Record<VertexId, VertexMark> = {};
  for (const vertex of graph.vertices) marks[vertex.id] = 'undiscovered';
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';

  const frontier: VertexId[] = [];
  const discoveryOrder: VertexId[] = [];
  const finishOrder: VertexId[] = [];
  const parent: Record<VertexId, VertexId | null> = { [start]: null };
  const hops: Record<VertexId, number> = { [start]: 0 };
  const recorder = createRecorder();
  const frontierKind = FRONTIER_KIND[algorithm];

  const lists = (): readonly StepList[] => [
    {
      titleKey: `explorer:panel.${frontierKind}`,
      items: frontier.map(label),
      ordered: true,
      hintKey: `explorer:panel.${frontierKind}Hint`,
    },
    { titleKey: 'explorer:panel.discoveryOrder', items: discoveryOrder.map(label), ordered: true },
    { titleKey: 'explorer:panel.finishOrder', items: finishOrder.map(label), ordered: true },
  ];

  const tables = (): readonly StepTable[] => [
    {
      titleKey: algorithm === 'bfs' ? 'explorer:panel.hopsAndParent' : 'explorer:panel.parentTable',
      columns:
        algorithm === 'bfs' ? [headerKey('explorer:panel.hops'), headerKey('explorer:panel.parent')] : [headerKey('explorer:panel.parent')],
      rows: graph.vertices.map((vertex) => ({
        header: headerText(vertex.label),
        cells:
          algorithm === 'bfs'
            ? [cellDistance(hops[vertex.id] ?? Infinity), cellLabel(parent[vertex.id] ? label(parent[vertex.id]!) : null)]
            : [cellLabel(parent[vertex.id] ? label(parent[vertex.id]!) : null)],
      })),
    },
  ];

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    key: string,
    values: Readonly<Record<string, string | number>>,
  ): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.traversal.${key}`, values },
      vertexMarks: marks,
      edgeMarks,
      tables: tables(),
      lists: lists(),
    });
  };

  const clearActiveEdges = (): void => {
    for (const edge of graph.edges) if (edgeMarks[edge.id] === 'active') edgeMarks[edge.id] = 'idle';
  };

  marks[start] = algorithm === 'bfs' ? 'discovered' : 'processing';
  frontier.push(start);
  discoveryOrder.push(start);
  record('start', 'start', { vertex: label(start) });

  if (algorithm === 'bfs') {
    while (frontier.length > 0) {
      const current = frontier.shift()!;
      marks[current] = 'processing';
      clearActiveEdges();
      record('dequeue', 'dequeue', { vertex: label(current) });
      for (const arc of outgoingArcs(graph, current)) {
        clearActiveEdges();
        if (marks[arc.to] === 'undiscovered') {
          marks[arc.to] = 'discovered';
          parent[arc.to] = current;
          hops[arc.to] = hops[current]! + 1;
          frontier.push(arc.to);
          discoveryOrder.push(arc.to);
          edgeMarks[arc.edge.id] = 'tree';
          record('discover', 'discover', { vertex: label(arc.to), from: label(current) });
        } else {
          if (edgeMarks[arc.edge.id] === 'idle') edgeMarks[arc.edge.id] = 'rejected';
          record('skipNeighbor', 'skipNeighbor', { vertex: label(arc.to), from: label(current) });
        }
      }
      marks[current] = 'processed';
      finishOrder.push(current);
      clearActiveEdges();
      record('finish', 'finish', { vertex: label(current) });
    }
  } else {
    // Each frame remembers how many of its vertex's arcs have been examined.
    const examined: Record<VertexId, number> = { [start]: 0 };
    while (frontier.length > 0) {
      const current = frontier[frontier.length - 1]!;
      const arcs = outgoingArcs(graph, current);
      const arc = arcs[examined[current]!];
      if (arc === undefined) {
        frontier.pop();
        marks[current] = 'processed';
        finishOrder.push(current);
        clearActiveEdges();
        record('finish', 'finish', { vertex: label(current) });
        continue;
      }
      examined[current] = examined[current]! + 1;
      clearActiveEdges();
      if (marks[arc.to] === 'undiscovered') {
        parent[arc.to] = current;
        marks[arc.to] = 'processing';
        examined[arc.to] = 0;
        frontier.push(arc.to);
        discoveryOrder.push(arc.to);
        edgeMarks[arc.edge.id] = 'tree';
        record('discover', 'discover', { vertex: label(arc.to), from: label(current) });
      } else {
        if (edgeMarks[arc.edge.id] === 'idle') edgeMarks[arc.edge.id] = 'rejected';
        record('skipNeighbor', 'skipNeighbor', { vertex: label(arc.to), from: label(current) });
      }
    }
  }

  const unreached = graph.vertices.filter((v) => marks[v.id] === 'undiscovered').length;
  clearActiveEdges();
  record('complete', unreached > 0 ? 'completeWithUnreached' : 'complete', { left: unreached });

  const result: TraversalResult = {
    discoveryOrder,
    finishOrder,
    parent,
    ...(algorithm === 'bfs' ? { hops } : {}),
  };
  return { algorithm, graph, startVertex: start, steps: recorder.steps, result };
}

/**
 * Connected components: BFS from every vertex that is still undiscovered, in
 * declaration order, numbering the components 1, 2, … as they are started.
 *
 * Defined for undirected graphs. (On a directed graph the same procedure would
 * compute neither weak nor strong components, so the algorithm registry asks
 * for an undirected graph.)
 */
export function connectedComponents(graph: Graph): AlgorithmTrace<ComponentsResult> {
  assertValidGraph(graph);
  if (graph.directed) throw new Error('Connected components requires an undirected graph');

  const label = (id: VertexId): string => vertexLabel(graph, id);
  const marks: Record<VertexId, VertexMark> = {};
  for (const vertex of graph.vertices) marks[vertex.id] = 'undiscovered';
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';

  const componentOf: Record<VertexId, number> = {};
  const components: VertexId[][] = [];
  const badges: Record<VertexId, string> = {};
  const recorder = createRecorder();

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    key: string,
    values: Readonly<Record<string, string | number>>,
    queue: readonly VertexId[],
  ): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.components.${key}`, values },
      vertexMarks: marks,
      vertexBadges: badges,
      edgeMarks,
      lists: [
        { titleKey: 'explorer:panel.queue', items: queue.map(label), ordered: true, hintKey: 'explorer:panel.queueHint' },
        ...components.map((member, i) => ({
          titleKey: 'explorer:panel.component',
          titleValues: { number: i + 1 },
          items: member.map(label),
          ordered: false,
        })),
      ],
      tables: [
        {
          titleKey: 'explorer:panel.componentTable',
          columns: [headerKey('explorer:panel.componentNumber')],
          rows: graph.vertices.map((vertex) => ({
            header: headerText(vertex.label),
            cells: [componentOf[vertex.id] === undefined ? cellLabel(null) : { kind: 'number', value: componentOf[vertex.id]! }],
          })),
        },
      ],
    });
  };

  if (graph.vertices.length === 0) {
    record('complete', 'empty', {}, []);
    return { algorithm: 'components', graph, startVertex: null, steps: recorder.steps, result: { componentOf, componentCount: 0, components: [] } };
  }

  for (const root of graph.vertices) {
    if (marks[root.id] !== 'undiscovered') continue;
    const number = components.length + 1;
    const member: VertexId[] = [root.id];
    components.push(member);
    componentOf[root.id] = number;
    badges[root.id] = String(number);
    marks[root.id] = 'discovered';
    const queue: VertexId[] = [root.id];
    record('restart', 'restart', { vertex: root.label, component: number }, queue);

    while (queue.length > 0) {
      const current = queue.shift()!;
      marks[current] = 'processing';
      record('dequeue', 'dequeue', { vertex: label(current), component: number }, queue);
      for (const arc of outgoingArcs(graph, current)) {
        if (marks[arc.to] === 'undiscovered') {
          marks[arc.to] = 'discovered';
          componentOf[arc.to] = number;
          badges[arc.to] = String(number);
          member.push(arc.to);
          queue.push(arc.to);
          edgeMarks[arc.edge.id] = 'tree';
          record('discover', 'discover', { vertex: label(arc.to), from: label(current), component: number }, queue);
        } else if (edgeMarks[arc.edge.id] === 'idle') {
          edgeMarks[arc.edge.id] = 'rejected';
          record('skipNeighbor', 'skipNeighbor', { vertex: label(arc.to), from: label(current) }, queue);
        }
      }
      marks[current] = 'processed';
      record('finish', 'finish', { vertex: label(current) }, queue);
    }
  }

  record('complete', 'complete', { components: components.length }, []);
  return {
    algorithm: 'components',
    graph,
    startVertex: null,
    steps: recorder.steps,
    result: { componentOf, componentCount: components.length, components },
  };
}
