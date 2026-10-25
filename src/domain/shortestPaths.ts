/**
 * Shortest paths: Dijkstra, Bellman–Ford and Floyd–Warshall.
 *
 * Shared conventions
 * - A distance of `Infinity` means "not reached"; it is shown as ∞.
 * - `previous[v]` is the vertex before `v` on the best path found so far, so the
 *   tree of `previous` links is the shortest-path tree.
 * - Relaxing an arc u→w means: if dist[u] + weight < dist[w], lower dist[w].
 * - Ties are broken by declaration order in `graph.vertices` / `graph.edges`,
 *   which makes every trace reproducible.
 * - In an undirected graph each edge is relaxed in both directions.
 *
 * Dijkstra. Repeatedly settles the unsettled vertex with the smallest finite
 * distance (first in declaration order on a tie) and relaxes its outgoing arcs
 * towards vertices that are not settled yet. Correct only for non-negative
 * weights: once a vertex is settled its distance is final, which a negative
 * weight could contradict, so the engine refuses negative weights instead of
 * silently returning a wrong answer.
 * Marks: settled → processed, the vertex being settled → processing, reached but
 * unsettled → discovered, unreached → undiscovered.
 *
 * Bellman–Ford. Relaxes *every* arc, in declaration order, up to n − 1 times;
 * after pass k every shortest path using at most k arcs has been found, so n − 1
 * passes suffice when no negative cycle exists. The run stops early when a pass
 * changes nothing. One extra pass then checks for a negative cycle: an arc that
 * can still be relaxed proves a cycle of negative total weight is reachable, and
 * from then on no distance is meaningful — the engine reports it and stops.
 *
 * Floyd–Warshall. Builds all-pairs distances in a matrix. After pivot k, cell
 * (i, j) holds the length of the shortest path from i to j whose intermediate
 * vertices all come from the first k vertices. A negative value on the diagonal
 * means i lies on a negative cycle. To keep the number of steps linear in the
 * size of the matrix, a step is recorded per pivot, per row examined and per
 * improvement — not per cell comparison.
 */

import {
  type Arc,
  type EdgeId,
  type Graph,
  type VertexId,
  allArcs,
  assertValidGraph,
  hasVertex,
  outgoingArcs,
  vertexLabel,
} from './graph';
import type { MessageDescriptor } from './messages';
import { createRecorder } from './recorder';
import {
  type AlgorithmTrace,
  type EdgeMark,
  type StepTable,
  type VertexMark,
  cellDistance,
  cellLabel,
  headerKey,
  headerText,
} from './trace';

export interface ShortestPathResult {
  readonly distance: Readonly<Record<VertexId, number>>;
  readonly previous: Readonly<Record<VertexId, VertexId | null>>;
  /** Bellman–Ford only: a reachable negative cycle was found, so distances are void. */
  readonly negativeCycle: boolean;
  /** Bellman–Ford only: how many relaxation passes actually ran. */
  readonly passes?: number;
  /** Dijkstra only: the order in which vertices were settled. */
  readonly settledOrder?: readonly VertexId[];
}

export interface AllPairsResult {
  /** `distance[from][to]`; `Infinity` when there is no path. */
  readonly distance: Readonly<Record<VertexId, Readonly<Record<VertexId, number>>>>;
  /** Vertices whose diagonal turned negative: each lies on a negative cycle. */
  readonly negativeCycleVertices: readonly VertexId[];
}

/** The path start → target along `previous`, or `null` when there is none. */
export function reconstructPath(result: ShortestPathResult, start: VertexId, target: VertexId): readonly VertexId[] | null {
  if (result.negativeCycle || !Number.isFinite(result.distance[target] ?? Infinity)) return null;
  const reversed: VertexId[] = [];
  const seen = new Set<VertexId>();
  let current: VertexId | null = target;
  while (current !== null) {
    if (seen.has(current)) return null; // Defensive: `previous` must never cycle.
    seen.add(current);
    reversed.push(current);
    current = result.previous[current] ?? null;
  }
  reversed.reverse();
  return reversed[0] === start ? reversed : null;
}

interface PathState {
  readonly graph: Graph;
  readonly label: (id: VertexId) => string;
  readonly distance: Record<VertexId, number>;
  readonly previous: Record<VertexId, VertexId | null>;
  readonly marks: Record<VertexId, VertexMark>;
  readonly edgeMarks: Record<EdgeId, EdgeMark>;
}

function createPathState(graph: Graph, start: VertexId): PathState {
  const distance: Record<VertexId, number> = {};
  const previous: Record<VertexId, VertexId | null> = {};
  const marks: Record<VertexId, VertexMark> = {};
  for (const vertex of graph.vertices) {
    distance[vertex.id] = Infinity;
    previous[vertex.id] = null;
    marks[vertex.id] = 'undiscovered';
  }
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';
  distance[start] = 0;
  marks[start] = 'discovered';
  return { graph, label: (id) => vertexLabel(graph, id), distance, previous, marks, edgeMarks };
}

function distanceTable(state: PathState): StepTable {
  return {
    titleKey: 'explorer:panel.distanceTable',
    columns: [headerKey('explorer:panel.distance'), headerKey('explorer:panel.previous')],
    rows: state.graph.vertices.map((vertex) => ({
      header: headerText(vertex.label),
      cells: [
        cellDistance(state.distance[vertex.id] ?? Infinity),
        cellLabel(state.previous[vertex.id] ? state.label(state.previous[vertex.id]!) : null),
      ],
    })),
  };
}

/** Marks the shortest-path tree: one `previous` link per reached vertex. */
function markTreeEdges(state: PathState): void {
  const treeEdges = new Set<EdgeId>();
  for (const vertex of state.graph.vertices) {
    const from = state.previous[vertex.id];
    if (!from) continue;
    const edge = state.graph.edges.find((e) =>
      state.graph.directed
        ? e.from === from && e.to === vertex.id
        : (e.from === from && e.to === vertex.id) || (e.from === vertex.id && e.to === from),
    );
    if (edge) treeEdges.add(edge.id);
  }
  for (const edge of state.graph.edges) {
    if (treeEdges.has(edge.id)) state.edgeMarks[edge.id] = 'tree';
    else if (state.edgeMarks[edge.id] === 'tree') state.edgeMarks[edge.id] = 'idle';
  }
}

export function dijkstra(graph: Graph, start: VertexId): AlgorithmTrace<ShortestPathResult> {
  assertValidGraph(graph);
  if (!hasVertex(graph, start)) throw new Error(`Unknown start vertex: ${start}`);
  if (graph.edges.some((e) => e.weight < 0)) throw new Error('Dijkstra requires non-negative edge weights');

  const state = createPathState(graph, start);
  const { label, distance, previous, marks, edgeMarks } = state;
  const settled: VertexId[] = [];
  const recorder = createRecorder();

  const candidates = (): readonly VertexId[] =>
    graph.vertices
      .map((v) => v.id)
      .filter((id) => !settled.includes(id) && Number.isFinite(distance[id]!))
      .sort((a, b) => distance[a]! - distance[b]!);

  const record = (op: Parameters<typeof recorder.record>[0]['op'], key: string, values: Readonly<Record<string, string | number>>): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.dijkstra.${key}`, values },
      vertexMarks: marks,
      edgeMarks,
      tables: [distanceTable(state)],
      lists: [
        { titleKey: 'explorer:panel.priorityQueue', items: candidates().map(label), ordered: true, hintKey: 'explorer:panel.priorityQueueHint' },
        { titleKey: 'explorer:panel.settled', items: settled.map(label), ordered: true },
      ],
    });
  };

  const clearActive = (): void => {
    for (const edge of graph.edges) if (edgeMarks[edge.id] === 'active') edgeMarks[edge.id] = 'idle';
  };

  record('start', 'start', { vertex: label(start) });

  for (;;) {
    let current: VertexId | undefined;
    for (const vertex of graph.vertices) {
      const id = vertex.id;
      if (settled.includes(id) || !Number.isFinite(distance[id]!)) continue;
      if (current === undefined || distance[id]! < distance[current]!) current = id;
    }
    if (current === undefined) break;

    settled.push(current);
    marks[current] = 'processing';
    clearActive();
    record('select', 'select', { vertex: label(current), distance: distance[current]! });

    for (const arc of outgoingArcs(graph, current)) {
      if (settled.includes(arc.to)) continue;
      clearActive();
      const candidate = distance[current]! + arc.weight;
      if (candidate < distance[arc.to]!) {
        distance[arc.to] = candidate;
        previous[arc.to] = current;
        if (marks[arc.to] === 'undiscovered') marks[arc.to] = 'discovered';
        markTreeEdges(state);
        edgeMarks[arc.edge.id] = 'active';
        record('relax', 'relax', { from: label(current), to: label(arc.to), weight: arc.weight, distance: candidate });
      } else {
        if (edgeMarks[arc.edge.id] !== 'tree') edgeMarks[arc.edge.id] = 'rejected';
        record('noChange', 'noChange', {
          from: label(current),
          to: label(arc.to),
          weight: arc.weight,
          candidate,
          current: Number.isFinite(distance[arc.to]!) ? distance[arc.to]! : '∞',
        });
      }
    }
    marks[current] = 'processed';
    clearActive();
    record('finish', 'settled', { vertex: label(current), distance: distance[current]! });
  }

  const unreached = graph.vertices.filter((v) => !Number.isFinite(distance[v.id]!));
  clearActive();
  markTreeEdges(state);
  record('complete', unreached.length > 0 ? 'completeWithUnreached' : 'complete', {
    vertices: unreached.map((v) => v.label).join(', '),
  });

  return {
    algorithm: 'dijkstra',
    graph,
    startVertex: start,
    steps: recorder.steps,
    result: { distance, previous, negativeCycle: false, settledOrder: settled },
  };
}

export function bellmanFord(graph: Graph, start: VertexId): AlgorithmTrace<ShortestPathResult> {
  assertValidGraph(graph);
  if (!hasVertex(graph, start)) throw new Error(`Unknown start vertex: ${start}`);

  const state = createPathState(graph, start);
  const { label, distance, previous, marks, edgeMarks } = state;
  const recorder = createRecorder();
  const notices: MessageDescriptor[] = [];
  const arcs: readonly Arc[] = allArcs(graph);
  let passesRun = 0;

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    key: string,
    values: Readonly<Record<string, string | number>>,
  ): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.bellman.${key}`, values },
      vertexMarks: marks,
      edgeMarks,
      tables: [distanceTable(state)],
      lists: [
        {
          titleKey: 'explorer:panel.edgeOrder',
          items: arcs.map((arc) => `${label(arc.from)}→${label(arc.to)}`),
          ordered: true,
          hintKey: 'explorer:panel.edgeOrderHint',
        },
      ],
      notices,
    });
  };

  const clearActive = (): void => {
    for (const edge of graph.edges) if (edgeMarks[edge.id] === 'active') edgeMarks[edge.id] = 'idle';
  };

  record('start', 'start', { vertex: label(start), passes: Math.max(graph.vertices.length - 1, 0) });

  for (let pass = 1; pass <= graph.vertices.length - 1; pass++) {
    passesRun = pass;
    let changed = false;
    clearActive();
    record('pass', 'pass', { pass, total: graph.vertices.length - 1 });

    for (const arc of arcs) {
      const base = distance[arc.from]!;
      clearActive();
      if (!Number.isFinite(base)) {
        edgeMarks[arc.edge.id] = 'rejected';
        record('noChange', 'skipUnreached', { from: label(arc.from), to: label(arc.to) });
        continue;
      }
      const candidate = base + arc.weight;
      if (candidate < distance[arc.to]!) {
        distance[arc.to] = candidate;
        previous[arc.to] = arc.from;
        if (marks[arc.to] === 'undiscovered') marks[arc.to] = 'discovered';
        changed = true;
        markTreeEdges(state);
        edgeMarks[arc.edge.id] = 'active';
        record('relax', 'relax', { from: label(arc.from), to: label(arc.to), weight: arc.weight, distance: candidate, pass });
      } else {
        if (edgeMarks[arc.edge.id] !== 'tree') edgeMarks[arc.edge.id] = 'rejected';
        record('noChange', 'noChange', {
          from: label(arc.from),
          to: label(arc.to),
          weight: arc.weight,
          candidate,
          current: Number.isFinite(distance[arc.to]!) ? distance[arc.to]! : '∞',
        });
      }
    }

    if (!changed) {
      clearActive();
      record('pass', 'settledEarly', { pass });
      break;
    }
  }

  // One extra pass: an arc that can still be relaxed proves a negative cycle.
  for (const arc of arcs) {
    const base = distance[arc.from]!;
    if (!Number.isFinite(base) || base + arc.weight >= distance[arc.to]!) continue;
    clearActive();
    edgeMarks[arc.edge.id] = 'active';
    notices.push({ key: 'explorer:notice.negativeCycle', values: { from: label(arc.from), to: label(arc.to) } });
    record('negativeCycle', 'negativeCycle', { from: label(arc.from), to: label(arc.to) });
    return {
      algorithm: 'bellmanFord',
      graph,
      startVertex: start,
      steps: recorder.steps,
      result: { distance, previous, negativeCycle: true, passes: passesRun },
    };
  }

  for (const vertex of graph.vertices) if (Number.isFinite(distance[vertex.id]!)) marks[vertex.id] = 'processed';
  const unreached = graph.vertices.filter((v) => !Number.isFinite(distance[v.id]!));
  clearActive();
  markTreeEdges(state);
  record('complete', unreached.length > 0 ? 'completeWithUnreached' : 'complete', {
    vertices: unreached.map((v) => v.label).join(', '),
    passes: passesRun,
  });

  return {
    algorithm: 'bellmanFord',
    graph,
    startVertex: start,
    steps: recorder.steps,
    result: { distance, previous, negativeCycle: false, passes: passesRun },
  };
}

export function floydWarshall(graph: Graph): AlgorithmTrace<AllPairsResult> {
  assertValidGraph(graph);

  const label = (id: VertexId): string => vertexLabel(graph, id);
  const ids = graph.vertices.map((v) => v.id);
  const distance: Record<VertexId, Record<VertexId, number>> = {};
  for (const from of ids) {
    distance[from] = {};
    for (const to of ids) distance[from]![to] = from === to ? 0 : Infinity;
  }
  for (const arc of allArcs(graph)) {
    // A simple graph has at most one arc per ordered pair, so `min` only guards
    // against the undirected pair being seen twice.
    distance[arc.from]![arc.to] = Math.min(distance[arc.from]![arc.to]!, arc.weight);
  }

  const marks: Record<VertexId, VertexMark> = {};
  for (const id of ids) marks[id] = 'undiscovered';
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';
  const recorder = createRecorder();
  const notices: MessageDescriptor[] = [];

  const matrix = (activeRow: VertexId | null, activeColumn: VertexId | null): StepTable => ({
    titleKey: 'explorer:panel.distanceMatrix',
    columns: graph.vertices.map((v) => headerText(v.label)),
    rows: graph.vertices.map((from) => ({
      header: headerText(from.label),
      cells: graph.vertices.map((to) => cellDistance(distance[from.id]![to.id]!)),
    })),
    ...(activeRow ? { activeRow: label(activeRow) } : {}),
    ...(activeColumn ? { activeColumn: label(activeColumn) } : {}),
  });

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    key: string,
    values: Readonly<Record<string, string | number>>,
    active: { readonly row?: VertexId; readonly column?: VertexId } = {},
  ): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.floyd.${key}`, values },
      vertexMarks: marks,
      edgeMarks,
      tables: [matrix(active.row ?? null, active.column ?? null)],
      notices,
    });
  };

  record('start', 'start', {});

  for (const pivot of ids) {
    for (const id of ids) marks[id] = id === pivot ? 'processing' : 'undiscovered';
    record('pivot', 'pivot', { vertex: label(pivot) }, { row: pivot, column: pivot });

    for (const from of ids) {
      // A row cannot improve through its own vertex, so the pivot row is skipped.
      if (from === pivot) continue;
      marks[from] = 'discovered';
      record('probe', 'row', { from: label(from), pivot: label(pivot) }, { row: from, column: pivot });
      for (const to of ids) {
        const throughPivot = distance[from]![pivot]! + distance[pivot]![to]!;
        if (!Number.isFinite(distance[from]![pivot]!) || !Number.isFinite(distance[pivot]![to]!)) continue;
        if (throughPivot >= distance[from]![to]!) continue;
        const before = distance[from]![to]!;
        distance[from]![to] = throughPivot;
        record(
          'improve',
          'improve',
          {
            from: label(from),
            to: label(to),
            pivot: label(pivot),
            before: Number.isFinite(before) ? before : '∞',
            after: throughPivot,
          },
          { row: from, column: to },
        );
      }
      marks[from] = 'undiscovered';
    }
  }

  const negativeCycleVertices = ids.filter((id) => distance[id]![id]! < 0);
  for (const id of ids) marks[id] = 'processed';
  if (negativeCycleVertices.length > 0) {
    notices.push({
      key: 'explorer:notice.negativeCycleVertices',
      values: { vertices: negativeCycleVertices.map(label).join(', ') },
    });
  }
  record('complete', negativeCycleVertices.length > 0 ? 'completeNegativeCycle' : 'complete', {
    vertices: negativeCycleVertices.map(label).join(', '),
  });

  return {
    algorithm: 'floydWarshall',
    graph,
    startVertex: null,
    steps: recorder.steps,
    result: { distance, negativeCycleVertices },
  };
}
