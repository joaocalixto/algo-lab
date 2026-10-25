/**
 * Topological ordering: Kahn's algorithm.
 *
 * Defined for directed graphs. A topological order lists the vertices so that
 * every arc points forward in the list; it exists exactly when the graph has no
 * directed cycle (that is, when it is a DAG). An undirected edge has no
 * direction to respect, so the question does not apply there.
 *
 * The algorithm keeps the in-degree of every vertex — how many arcs still point
 * into it. Vertices of in-degree 0 have no unmet prerequisite and form the
 * ready queue, in declaration order. Taking one out appends it to the order and
 * removes its outgoing arcs, which lowers the in-degree of its targets; a target
 * that reaches 0 joins the ready queue.
 *
 * Cycle detection falls out of it: if the queue empties while vertices remain,
 * every remaining vertex still has an incoming arc, so following arcs backwards
 * among them can never stop — they contain a cycle. The engine then reports the
 * cycle and the vertices caught in it instead of returning a partial order as if
 * it were valid.
 *
 * Determinism: the ready queue is a FIFO fed in declaration order, so among
 * several valid topological orders this engine always produces the same one.
 */

import { type EdgeId, type Graph, type VertexId, assertValidGraph, outgoingArcs, vertexLabel } from './graph';
import type { MessageDescriptor } from './messages';
import { createRecorder } from './recorder';
import { type AlgorithmTrace, type EdgeMark, type VertexMark, cellNumber, headerKey, headerText } from './trace';

export interface TopologicalResult {
  /** The vertices in topological order; incomplete when `hasCycle` is true. */
  readonly order: readonly VertexId[];
  readonly hasCycle: boolean;
  /** Vertices never emitted: empty unless the graph has a cycle. */
  readonly remaining: readonly VertexId[];
}

export function kahn(graph: Graph): AlgorithmTrace<TopologicalResult> {
  assertValidGraph(graph);
  if (!graph.directed) throw new Error("Kahn's algorithm requires a directed graph");

  const label = (id: VertexId): string => vertexLabel(graph, id);
  const ids = graph.vertices.map((v) => v.id);
  const marks: Record<VertexId, VertexMark> = {};
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const id of ids) marks[id] = 'undiscovered';
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';

  const inDegrees: Record<VertexId, number> = {};
  for (const id of ids) inDegrees[id] = 0;
  for (const edge of graph.edges) inDegrees[edge.to] = (inDegrees[edge.to] ?? 0) + 1;

  const order: VertexId[] = [];
  const badges: Record<VertexId, string> = {};
  const recorder = createRecorder();
  const notices: MessageDescriptor[] = [];
  const queue: VertexId[] = [];

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    key: string,
    values: Readonly<Record<string, string | number>>,
  ): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.kahn.${key}`, values },
      vertexMarks: marks,
      vertexBadges: badges,
      edgeMarks,
      tables: [
        {
          titleKey: 'explorer:panel.inDegreeTable',
          columns: [headerKey('explorer:panel.inDegree')],
          rows: graph.vertices.map((vertex) => ({
            header: headerText(vertex.label),
            cells: [cellNumber(inDegrees[vertex.id] ?? 0)],
          })),
        },
      ],
      lists: [
        { titleKey: 'explorer:panel.readyQueue', items: queue.map(label), ordered: true, hintKey: 'explorer:panel.readyQueueHint' },
        { titleKey: 'explorer:panel.topologicalOrder', items: order.map(label), ordered: true },
      ],
      notices,
    });
  };

  for (const id of ids) {
    if (inDegrees[id] === 0) {
      queue.push(id);
      marks[id] = 'discovered';
    }
  }
  record('start', 'start', { ready: queue.length });

  while (queue.length > 0) {
    const current = queue.shift()!;
    marks[current] = 'processing';
    order.push(current);
    badges[current] = String(order.length);
    for (const edge of graph.edges) if (edgeMarks[edge.id] === 'active') edgeMarks[edge.id] = 'idle';
    record('emit', 'emit', { vertex: label(current), position: order.length });

    for (const arc of outgoingArcs(graph, current)) {
      inDegrees[arc.to] = (inDegrees[arc.to] ?? 0) - 1;
      edgeMarks[arc.edge.id] = 'tree';
      if (inDegrees[arc.to] === 0) {
        queue.push(arc.to);
        marks[arc.to] = 'discovered';
        record('discover', 'ready', { vertex: label(arc.to), from: label(current) });
      } else {
        record('consider', 'decrement', { vertex: label(arc.to), from: label(current), inDegree: inDegrees[arc.to]! });
      }
    }
    marks[current] = 'processed';
    record('finish', 'done', { vertex: label(current) });
  }

  const remaining = ids.filter((id) => !order.includes(id));
  if (remaining.length > 0) {
    for (const edge of graph.edges) {
      if (remaining.includes(edge.from) && remaining.includes(edge.to)) edgeMarks[edge.id] = 'rejected';
    }
    notices.push({ key: 'explorer:notice.cycle', values: { vertices: remaining.map(label).join(', ') } });
    record('cycleDetected', 'cycle', { remaining: remaining.length, vertices: remaining.map(label).join(', ') });
  } else {
    record('complete', 'complete', { order: order.map(label).join(' → ') });
  }

  return {
    algorithm: 'kahn',
    graph,
    startVertex: null,
    steps: recorder.steps,
    result: { order, hasCycle: remaining.length > 0, remaining },
  };
}
