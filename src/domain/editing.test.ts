import { describe, expect, it } from 'vitest';
import { DEFAULT_GENERATOR_OPTIONS } from './generator';
import { findEdge, validateGraph } from './graph';
import { CANVAS } from './layout';
import {
  addEdge,
  addVertex,
  clearGraph,
  draftFromGenerator,
  emptyDraft,
  ensureLayout,
  moveVertex,
  nextLabel,
  removeEdge,
  removeVertex,
  reverseEdge,
  setEdgeWeight,
  setKind,
} from './editing';

function withVertices(count: number, weighted = true) {
  let draft = emptyDraft(false, weighted);
  for (let i = 0; i < count; i++) draft = addVertex(draft, { x: 100 + i * 40, y: 100 }).draft;
  return draft;
}

describe('vertices', () => {
  it('labels new vertices A, B, C … and keeps the draft valid', () => {
    const draft = withVertices(3);
    expect(draft.graph.vertices.map((v) => v.label)).toEqual(['A', 'B', 'C']);
    expect(validateGraph(draft.graph)).toEqual([]);
  });

  it('reuses a label freed by a deletion', () => {
    const draft = withVertices(3);
    const smaller = removeVertex(draft, draft.graph.vertices[1]!.id);
    expect(nextLabel(smaller.graph)).toBe('B');
    expect(addVertex(smaller, { x: 10, y: 10 }).draft.graph.vertices.map((v) => v.label)).toEqual(['A', 'C', 'B']);
  });

  it('removes the edges of a deleted vertex', () => {
    let draft = withVertices(3);
    const [a, b, c] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 2).draft;
    draft = addEdge(draft, b!, c!, 3).draft;
    const smaller = removeVertex(draft, b!);
    expect(smaller.graph.edges).toEqual([]);
    expect(smaller.layout[b!]).toBeUndefined();
  });

  it('keeps a dragged vertex inside the canvas', () => {
    const draft = withVertices(1);
    const id = draft.graph.vertices[0]!.id;
    const moved = moveVertex(draft, id, { x: -500, y: 99999 });
    expect(moved.layout[id]!.x).toBeGreaterThan(0);
    expect(moved.layout[id]!.y).toBeLessThanOrEqual(CANVAS.height);
  });

  it('refuses more vertices than the label range allows', () => {
    let draft = emptyDraft(false, false);
    for (let i = 0; i < 26; i++) draft = addVertex(draft, { x: 50, y: 50 }).draft;
    const result = addVertex(draft, { x: 50, y: 50 });
    expect(result.problem).toBe('tooManyVertices');
    expect(result.draft.graph.vertices).toHaveLength(26);
  });
});

describe('edges', () => {
  it('refuses a self-loop and a duplicate, leaving the draft untouched', () => {
    let draft = withVertices(2);
    const [a, b] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 4).draft;
    expect(addEdge(draft, a!, a!).problem).toBe('selfLoop');
    expect(addEdge(draft, b!, a!).problem).toBe('duplicateEdge');
    expect(addEdge(draft, a!, 'nope').problem).toBe('unknownVertex');
    expect(draft.graph.edges).toHaveLength(1);
  });

  it('allows both orientations between a pair once directed', () => {
    let draft = withVertices(2);
    const [a, b] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 1).draft;
    draft = setKind(draft, { directed: true });
    const result = addEdge(draft, b!, a!, 5);
    expect(result.problem).toBeUndefined();
    expect(result.draft.graph.edges).toHaveLength(2);
    expect(validateGraph(result.draft.graph)).toEqual([]);
  });

  it('edits weights, including negative ones, and ignores them when unweighted', () => {
    let draft = withVertices(2);
    const [a, b] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 3).draft;
    const edgeId = draft.graph.edges[0]!.id;
    expect(setEdgeWeight(draft, edgeId, -7).graph.edges[0]!.weight).toBe(-7);
    expect(setEdgeWeight(draft, edgeId, Number.NaN).graph.edges[0]!.weight).toBe(3);
    const unweighted = setKind(draft, { weighted: false });
    expect(setEdgeWeight(unweighted, edgeId, 9).graph.edges[0]!.weight).toBe(1);
  });

  it('turns a directed edge around unless the opposite already exists', () => {
    let draft = setKind(withVertices(2), { directed: true });
    const [a, b] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 2).draft;
    const reversed = reverseEdge(draft, draft.graph.edges[0]!.id);
    expect(reversed.draft.graph.edges[0]).toMatchObject({ from: b, to: a });
    const both = addEdge(reversed.draft, a!, b!, 1).draft;
    expect(reverseEdge(both, both.graph.edges[0]!.id).problem).toBe('duplicateEdge');
  });

  it('deletes an edge without touching its vertices', () => {
    let draft = withVertices(2);
    const [a, b] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 1).draft;
    const smaller = removeEdge(draft, draft.graph.edges[0]!.id);
    expect(smaller.graph.edges).toEqual([]);
    expect(smaller.graph.vertices).toHaveLength(2);
  });
});

describe('whole-graph operations', () => {
  it('clears the graph but keeps the chosen kind', () => {
    const draft = setKind(withVertices(3), { directed: true });
    const cleared = clearGraph(draft);
    expect(cleared.graph.vertices).toEqual([]);
    expect(cleared.graph.directed).toBe(true);
    expect(cleared.layout).toEqual({});
  });

  it('hands a generated graph straight to the manual editor', () => {
    const generated = draftFromGenerator({ ...DEFAULT_GENERATOR_OPTIONS, seed: 12 }, 'circle');
    const edited = addVertex(generated, { x: 200, y: 200 }).draft;
    expect(edited.graph.vertices).toHaveLength(generated.graph.vertices.length + 1);
    expect(Object.keys(edited.layout)).toHaveLength(edited.graph.vertices.length);
    expect(validateGraph(edited.graph)).toEqual([]);
  });

  it('drops the reverse edge when going back to undirected', () => {
    let draft = setKind(withVertices(2), { directed: true });
    const [a, b] = draft.graph.vertices.map((v) => v.id);
    draft = addEdge(draft, a!, b!, 1).draft;
    draft = addEdge(draft, b!, a!, 2).draft;
    const undirected = setKind(draft, { directed: false });
    expect(undirected.graph.edges).toHaveLength(1);
    expect(findEdge(undirected.graph, b!, a!)).toBeDefined();
  });

  it('gives a position to vertices the layout does not cover', () => {
    const draft = { graph: withVertices(2).graph, layout: {} };
    const fixed = ensureLayout(draft);
    expect(Object.keys(fixed.layout)).toHaveLength(2);
  });
});
