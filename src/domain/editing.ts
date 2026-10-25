/**
 * Pure editing operations for the graph builder.
 *
 * A `GraphDraft` is the graph plus where its vertices are drawn. Every
 * operation returns a new draft and never mutates the old one, so the UI can
 * hold a draft in state and the editor stays predictable. Operations that a
 * simple graph forbids (a self-loop, a second edge between the same pair) are
 * refused with a reason instead of silently producing an invalid graph.
 *
 * Ids are internal and stable; labels are what the reader sees. A new vertex
 * takes the first unused label from A, B, … Z, then 27, 28, … so the drawing
 * stays readable past the alphabet.
 */

import {
  type Edge,
  type Graph,
  type GraphLayout,
  type Point,
  type VertexId,
  type EdgeId,
  UNWEIGHTED_WEIGHT,
  findEdge,
  setGraphKind,
} from './graph';
import type { PrerequisiteKind } from './algorithms';
import { type GeneratorOptions, MAX_VERTICES, defaultLabel, generateGraph } from './generator';
import { CANVAS, type LayoutKind, type Viewport, clampToViewport, layoutGraph } from './layout';

export interface GraphDraft {
  readonly graph: Graph;
  readonly layout: GraphLayout;
}

export type EditProblem = 'selfLoop' | 'duplicateEdge' | 'tooManyVertices' | 'unknownVertex';

export interface EditResult {
  readonly draft: GraphDraft;
  /** Set when the operation was refused; the draft is then unchanged. */
  readonly problem?: EditProblem;
}

export function emptyDraft(directed: boolean, weighted: boolean): GraphDraft {
  return { graph: { directed, weighted, vertices: [], edges: [] }, layout: {} };
}

export function draftFromGenerator(options: GeneratorOptions, layoutKind: LayoutKind, viewport: Viewport = CANVAS): GraphDraft {
  const graph = generateGraph(options);
  return { graph, layout: layoutGraph(graph, layoutKind, viewport) };
}

export function relayout(draft: GraphDraft, kind: LayoutKind, viewport: Viewport = CANVAS): GraphDraft {
  return { graph: draft.graph, layout: layoutGraph(draft.graph, kind, viewport) };
}

export function clearGraph(draft: GraphDraft): GraphDraft {
  return emptyDraft(draft.graph.directed, draft.graph.weighted);
}

export function setKind(draft: GraphDraft, kind: { readonly directed?: boolean; readonly weighted?: boolean }): GraphDraft {
  return { graph: setGraphKind(draft.graph, kind), layout: draft.layout };
}

/** The first label not already in use. */
export function nextLabel(graph: Graph): string {
  const used = new Set(graph.vertices.map((v) => v.label));
  for (let i = 0; i < MAX_VERTICES; i++) {
    const label = defaultLabel(i);
    if (!used.has(label)) return label;
  }
  let number = MAX_VERTICES + 1;
  while (used.has(String(number))) number += 1;
  return String(number);
}

function nextId(existing: readonly string[], prefix: string): string {
  let n = existing.length;
  while (existing.includes(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

export function addVertex(draft: GraphDraft, at: Point, viewport: Viewport = CANVAS): EditResult {
  if (draft.graph.vertices.length >= MAX_VERTICES) return { draft, problem: 'tooManyVertices' };
  const id = nextId(draft.graph.vertices.map((v) => v.id), 'v');
  const vertex = { id, label: nextLabel(draft.graph) };
  return {
    draft: {
      graph: { ...draft.graph, vertices: [...draft.graph.vertices, vertex] },
      layout: { ...draft.layout, [id]: clampToViewport(at, viewport) },
    },
  };
}

export function removeVertex(draft: GraphDraft, id: VertexId): GraphDraft {
  const layout: Record<VertexId, Point> = { ...draft.layout };
  delete layout[id];
  return {
    graph: {
      ...draft.graph,
      vertices: draft.graph.vertices.filter((v) => v.id !== id),
      edges: draft.graph.edges.filter((e) => e.from !== id && e.to !== id),
    },
    layout,
  };
}

export function moveVertex(draft: GraphDraft, id: VertexId, to: Point, viewport: Viewport = CANVAS): GraphDraft {
  if (!draft.layout[id]) return draft;
  return { graph: draft.graph, layout: { ...draft.layout, [id]: clampToViewport(to, viewport) } };
}

export function addEdge(draft: GraphDraft, from: VertexId, to: VertexId, weight?: number): EditResult {
  const { graph } = draft;
  if (!graph.vertices.some((v) => v.id === from) || !graph.vertices.some((v) => v.id === to))
    return { draft, problem: 'unknownVertex' };
  if (from === to) return { draft, problem: 'selfLoop' };
  if (findEdge(graph, from, to)) return { draft, problem: 'duplicateEdge' };
  const edge: Edge = {
    id: nextId(graph.edges.map((e) => e.id), 'e'),
    from,
    to,
    weight: graph.weighted ? (weight ?? 1) : UNWEIGHTED_WEIGHT,
  };
  return { draft: { graph: { ...graph, edges: [...graph.edges, edge] }, layout: draft.layout } };
}

export function removeEdge(draft: GraphDraft, id: EdgeId): GraphDraft {
  return { graph: { ...draft.graph, edges: draft.graph.edges.filter((e) => e.id !== id) }, layout: draft.layout };
}

/** Ignored on an unweighted graph, where every weight is fixed at 1. */
export function setEdgeWeight(draft: GraphDraft, id: EdgeId, weight: number): GraphDraft {
  if (!draft.graph.weighted || !Number.isFinite(weight)) return draft;
  return {
    graph: { ...draft.graph, edges: draft.graph.edges.map((e) => (e.id === id ? { ...e, weight } : e)) },
    layout: draft.layout,
  };
}

/** Turns an edge around; only meaningful in a directed graph. */
export function reverseEdge(draft: GraphDraft, id: EdgeId): EditResult {
  const edge = draft.graph.edges.find((e) => e.id === id);
  if (!edge) return { draft };
  if (!draft.graph.directed) return { draft };
  if (findEdge(draft.graph, edge.to, edge.from)) return { draft, problem: 'duplicateEdge' };
  return {
    draft: {
      graph: {
        ...draft.graph,
        edges: draft.graph.edges.map((e) => (e.id === id ? { ...e, from: edge.to, to: edge.from } : e)),
      },
      layout: draft.layout,
    },
  };
}

/**
 * Changes the graph so that the listed prerequisites hold: switches direction
 * or turns weights on, and replaces each negative weight by its absolute value
 * when an algorithm needs non-negative weights. Used by the "adjust the graph"
 * shortcut next to an algorithm that does not apply.
 */
export function fixForPrerequisites(draft: GraphDraft, unmet: readonly PrerequisiteKind[]): GraphDraft {
  let next = draft;
  if (unmet.includes('weighted')) next = setKind(next, { weighted: true });
  if (unmet.includes('directed')) next = setKind(next, { directed: true });
  if (unmet.includes('undirected')) next = setKind(next, { directed: false });
  if (unmet.includes('nonNegativeWeights')) {
    next = {
      graph: { ...next.graph, edges: next.graph.edges.map((e) => (e.weight < 0 ? { ...e, weight: Math.abs(e.weight) } : e)) },
      layout: next.layout,
    };
  }
  return next;
}

/** Positions for vertices the layout does not cover yet (e.g. after an import). */
export function ensureLayout(draft: GraphDraft, kind: LayoutKind = 'circle', viewport: Viewport = CANVAS): GraphDraft {
  const missing = draft.graph.vertices.filter((v) => !draft.layout[v.id]);
  if (missing.length === 0) return draft;
  const fallback = layoutGraph(draft.graph, kind, viewport);
  const layout: Record<VertexId, Point> = { ...draft.layout };
  for (const vertex of missing) layout[vertex.id] = fallback[vertex.id]!;
  return { graph: draft.graph, layout };
}
