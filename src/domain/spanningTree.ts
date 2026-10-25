/**
 * Minimum spanning trees: Kruskal and Prim.
 *
 * Both are defined for undirected graphs: a spanning tree has no orientation,
 * and on a directed graph the corresponding problem (a minimum spanning
 * arborescence) is a different algorithm. Weights may be negative — neither
 * algorithm cares, because neither adds weights along a path.
 *
 * Kruskal. Sorts the edges by weight (ascending; equal weights keep their
 * declaration order, so ties are broken the same way every run) and walks that
 * list once. An edge is accepted when its endpoints lie in different components
 * of the forest built so far, and rejected when they already lie in the same
 * one — accepting it would close a cycle. Components are tracked with
 * union–find (`createUnionFind`), which is what makes the test cheap. The walk
 * stops as soon as n − 1 edges have been accepted, since no further edge could
 * join two different components; on a small graph that can mean the last edges
 * are never examined.
 *
 * Prim. Grows one tree from a start vertex. A "fringe" holds, for every vertex
 * outside the tree that is adjacent to it, the cheapest edge reaching it
 * (`key`) and that edge (`fringeEdge`). Each round moves the fringe vertex with
 * the smallest key into the tree (first in declaration order on a tie), then
 * updates the fringe from the new vertex's arcs. This is the priority-queue
 * formulation, so the number of steps stays proportional to the graph size.
 *
 * On a disconnected graph neither algorithm can return a spanning tree:
 * Kruskal yields a minimum spanning *forest* (one tree per component) and Prim
 * spans only the start vertex's component. Both report it in `result` and raise
 * a notice, rather than pretending the answer is a spanning tree.
 */

import { type EdgeId, type Graph, type VertexId, assertValidGraph, hasVertex, outgoingArcs, vertexLabel } from './graph';
import type { MessageDescriptor } from './messages';
import { createRecorder } from './recorder';
import {
  type AlgorithmTrace,
  type EdgeMark,
  type VertexMark,
  cellDistance,
  cellLabel,
  cellText,
  headerKey,
  headerText,
} from './trace';

export interface SpanningTreeResult {
  /** Accepted edges, in the order they were accepted. */
  readonly treeEdges: readonly EdgeId[];
  readonly totalWeight: number;
  /** True when the accepted edges span every vertex (n − 1 edges, one tree). */
  readonly isSpanningTree: boolean;
  /** Number of trees in the result: 1 for a spanning tree, more for a forest. */
  readonly treeCount: number;
}

/**
 * Union–find (disjoint-set) over vertex ids, with path compression and union by
 * size. `find` returns the representative of a vertex's set, so two vertices are
 * in the same component exactly when their representatives are equal.
 */
export interface UnionFind {
  readonly find: (id: VertexId) => VertexId;
  /** Joins the two sets; false when they were already the same set. */
  readonly union: (a: VertexId, b: VertexId) => boolean;
  readonly setCount: () => number;
  /** Current representative of every vertex, for display. */
  readonly roots: () => Readonly<Record<VertexId, VertexId>>;
}

export function createUnionFind(ids: readonly VertexId[]): UnionFind {
  const parent = new Map<VertexId, VertexId>(ids.map((id) => [id, id]));
  const size = new Map<VertexId, number>(ids.map((id) => [id, 1]));
  let sets = ids.length;

  const find = (id: VertexId): VertexId => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let walk = id;
    while (parent.get(walk) !== root) {
      const next = parent.get(walk)!;
      parent.set(walk, root);
      walk = next;
    }
    return root;
  };

  return {
    find,
    union(a, b) {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA === rootB) return false;
      const [big, small] = size.get(rootA)! >= size.get(rootB)! ? [rootA, rootB] : [rootB, rootA];
      parent.set(small, big);
      size.set(big, size.get(big)! + size.get(small)!);
      sets -= 1;
      return true;
    },
    setCount: () => sets,
    roots: () => Object.fromEntries(ids.map((id) => [id, find(id)])),
  };
}

export function kruskal(graph: Graph): AlgorithmTrace<SpanningTreeResult> {
  assertValidGraph(graph);
  if (graph.directed) throw new Error('Kruskal requires an undirected graph');

  const label = (id: VertexId): string => vertexLabel(graph, id);
  const ids = graph.vertices.map((v) => v.id);
  const marks: Record<VertexId, VertexMark> = {};
  for (const id of ids) marks[id] = 'undiscovered';
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';

  const sets = createUnionFind(ids);
  const treeEdges: EdgeId[] = [];
  /** Vertices touched by an accepted edge: they are part of the forest. */
  const inForest = new Set<VertexId>();
  const recorder = createRecorder();
  const notices: MessageDescriptor[] = [];
  // Stable sort: equal weights keep declaration order, so ties are deterministic.
  const sorted = [...graph.edges].sort((a, b) => a.weight - b.weight);
  let totalWeight = 0;

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    key: string,
    values: Readonly<Record<string, string | number>>,
  ): void => {
    const roots = sets.roots();
    recorder.record({
      op,
      explanation: { key: `explorer:steps.kruskal.${key}`, values },
      vertexMarks: marks,
      edgeMarks,
      tables: [
        {
          titleKey: 'explorer:panel.componentRoots',
          columns: [headerKey('explorer:panel.root')],
          rows: graph.vertices.map((vertex) => ({
            header: headerText(vertex.label),
            cells: [cellLabel(label(roots[vertex.id]!))],
          })),
        },
      ],
      lists: [
        {
          titleKey: 'explorer:panel.sortedEdges',
          items: sorted.map((edge) => `${label(edge.from)}–${label(edge.to)} (${edge.weight})`),
          ordered: true,
          hintKey: 'explorer:panel.sortedEdgesHint',
        },
        {
          titleKey: 'explorer:panel.treeEdges',
          items: treeEdges.map((id) => {
            const edge = graph.edges.find((e) => e.id === id)!;
            return `${label(edge.from)}–${label(edge.to)} (${edge.weight})`;
          }),
          ordered: true,
        },
      ],
      notices,
    });
  };

  record('start', 'start', { edges: graph.edges.length });

  for (const edge of sorted) {
    for (const id of ids) marks[id] = inForest.has(id) ? 'processed' : 'undiscovered';
    marks[edge.from] = 'processing';
    marks[edge.to] = 'processing';
    for (const other of graph.edges) if (edgeMarks[other.id] === 'active') edgeMarks[other.id] = 'idle';
    edgeMarks[edge.id] = 'active';
    record('consider', 'consider', { from: label(edge.from), to: label(edge.to), weight: edge.weight });

    if (sets.union(edge.from, edge.to)) {
      treeEdges.push(edge.id);
      totalWeight += edge.weight;
      inForest.add(edge.from);
      inForest.add(edge.to);
      edgeMarks[edge.id] = 'tree';
      marks[edge.from] = 'processed';
      marks[edge.to] = 'processed';
      record('accept', 'accept', {
        from: label(edge.from),
        to: label(edge.to),
        weight: edge.weight,
        total: totalWeight,
        edges: treeEdges.length,
      });
    } else {
      edgeMarks[edge.id] = 'rejected';
      record('reject', 'reject', { from: label(edge.from), to: label(edge.to), weight: edge.weight });
    }

    if (treeEdges.length === Math.max(ids.length - 1, 0) && ids.length > 0) break;
  }

  const treeCount = sets.setCount();
  const isSpanningTree = ids.length > 0 && treeCount === 1;
  for (const id of ids) if (inForest.has(id) || ids.length === 1) marks[id] = 'processed';
  if (!isSpanningTree && ids.length > 1) notices.push({ key: 'explorer:notice.spanningForest', values: { trees: treeCount } });
  record('complete', isSpanningTree ? 'complete' : 'completeForest', { total: totalWeight, edges: treeEdges.length, trees: treeCount });

  return {
    algorithm: 'kruskal',
    graph,
    startVertex: null,
    steps: recorder.steps,
    result: { treeEdges, totalWeight, isSpanningTree, treeCount },
  };
}

export function prim(graph: Graph, start: VertexId): AlgorithmTrace<SpanningTreeResult> {
  assertValidGraph(graph);
  if (graph.directed) throw new Error('Prim requires an undirected graph');
  if (!hasVertex(graph, start)) throw new Error(`Unknown start vertex: ${start}`);

  const label = (id: VertexId): string => vertexLabel(graph, id);
  const ids = graph.vertices.map((v) => v.id);
  const marks: Record<VertexId, VertexMark> = {};
  for (const id of ids) marks[id] = 'undiscovered';
  const edgeMarks: Record<EdgeId, EdgeMark> = {};
  for (const edge of graph.edges) edgeMarks[edge.id] = 'idle';

  const key: Record<VertexId, number> = {};
  const fringeEdge: Record<VertexId, EdgeId | null> = {};
  for (const id of ids) {
    key[id] = Infinity;
    fringeEdge[id] = null;
  }
  key[start] = 0;
  marks[start] = 'discovered';

  const inTree = new Set<VertexId>();
  const treeEdges: EdgeId[] = [];
  const recorder = createRecorder();
  const notices: MessageDescriptor[] = [];
  let totalWeight = 0;

  const fringe = (): readonly VertexId[] =>
    ids.filter((id) => !inTree.has(id) && Number.isFinite(key[id]!)).sort((a, b) => key[a]! - key[b]!);

  const record = (
    op: Parameters<typeof recorder.record>[0]['op'],
    messageKey: string,
    values: Readonly<Record<string, string | number>>,
  ): void => {
    recorder.record({
      op,
      explanation: { key: `explorer:steps.prim.${messageKey}`, values },
      vertexMarks: marks,
      edgeMarks,
      tables: [
        {
          titleKey: 'explorer:panel.fringeTable',
          columns: [headerKey('explorer:panel.cheapestEdge'), headerKey('explorer:panel.fromTree')],
          rows: graph.vertices.map((vertex) => ({
            header: headerText(vertex.label),
            cells: [
              inTree.has(vertex.id) ? cellText('✓') : cellDistance(key[vertex.id] ?? Infinity),
              cellLabel(fringeEdgeSource(vertex.id)),
            ],
          })),
        },
      ],
      lists: [
        { titleKey: 'explorer:panel.fringe', items: fringe().map((id) => `${label(id)} (${key[id]})`), ordered: true, hintKey: 'explorer:panel.fringeHint' },
        {
          titleKey: 'explorer:panel.treeEdges',
          items: treeEdges.map((id) => {
            const edge = graph.edges.find((e) => e.id === id)!;
            return `${label(edge.from)}–${label(edge.to)} (${edge.weight})`;
          }),
          ordered: true,
        },
      ],
      notices,
    });
  };

  function fringeEdgeSource(id: VertexId): string | null {
    const edgeId = fringeEdge[id];
    if (!edgeId) return null;
    const edge = graph.edges.find((e) => e.id === edgeId)!;
    const other = edge.from === id ? edge.to : edge.from;
    return label(other);
  }

  record('start', 'start', { vertex: label(start) });

  for (;;) {
    let next: VertexId | undefined;
    for (const id of ids) {
      if (inTree.has(id) || !Number.isFinite(key[id]!)) continue;
      if (next === undefined || key[id]! < key[next]!) next = id;
    }
    if (next === undefined) break;

    inTree.add(next);
    marks[next] = 'processing';
    const chosen = fringeEdge[next];
    if (chosen) {
      treeEdges.push(chosen);
      totalWeight += graph.edges.find((e) => e.id === chosen)!.weight;
      edgeMarks[chosen] = 'tree';
    }
    record(chosen ? 'accept' : 'select', chosen ? 'accept' : 'startVertex', {
      vertex: label(next),
      weight: key[next]!,
      total: totalWeight,
    });
    marks[next] = 'processed';

    for (const arc of outgoingArcs(graph, next)) {
      if (inTree.has(arc.to)) {
        if (edgeMarks[arc.edge.id] === 'idle') {
          edgeMarks[arc.edge.id] = 'rejected';
          record('reject', 'insideTree', { from: label(next), to: label(arc.to) });
        }
        continue;
      }
      if (arc.weight < key[arc.to]!) {
        const previousKey = key[arc.to]!;
        key[arc.to] = arc.weight;
        fringeEdge[arc.to] = arc.edge.id;
        marks[arc.to] = 'discovered';
        record('consider', 'improveFringe', {
          vertex: label(arc.to),
          weight: arc.weight,
          from: label(next),
          previous: Number.isFinite(previousKey) ? previousKey : '∞',
        });
      } else {
        record('reject', 'keepFringe', { vertex: label(arc.to), weight: arc.weight, current: key[arc.to]! });
      }
    }
  }

  const spanned = inTree.size;
  const outside = graph.vertices.filter((v) => !inTree.has(v.id));
  const isSpanningTree = spanned === ids.length && ids.length > 0;
  if (!isSpanningTree) notices.push({ key: 'explorer:notice.primPartial', values: { reached: spanned, total: ids.length } });
  record('complete', isSpanningTree ? 'complete' : 'completePartial', {
    total: totalWeight,
    edges: treeEdges.length,
    reached: spanned,
    vertices: outside.map((v) => v.label).join(', '),
  });

  return {
    algorithm: 'prim',
    graph,
    startVertex: start,
    steps: recorder.steps,
    result: {
      treeEdges,
      totalWeight,
      isSpanningTree,
      treeCount: isSpanningTree ? 1 : ids.length - treeEdges.length,
    },
  };
}
