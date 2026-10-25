/**
 * Shared shape of a precomputed execution.
 *
 * Every algorithm in the module compiles its whole run into an immutable array
 * of steps before anything is shown. Playback only moves an index over that
 * array, so animation can never affect correctness, and stepping backwards is
 * exact rather than a re-simulation.
 *
 * A step describes what the reader should see, in presentation-neutral terms:
 * a mark per vertex, a mark per edge, optional badges, and small tables/lists
 * for the side panel. All text is carried as `MessageDescriptor`s (key plus
 * values) or as language-neutral vertex labels, never as rendered sentences.
 */

import type { EdgeId, Graph, VertexId } from './graph';
import type { MessageDescriptor } from './messages';

export type AlgorithmId =
  | 'bfs'
  | 'dfs'
  | 'components'
  | 'dijkstra'
  | 'bellmanFord'
  | 'floydWarshall'
  | 'kruskal'
  | 'prim'
  | 'kahn';

/**
 * Vertex lifecycle shared by every algorithm, so that one visual language
 * serves the whole module. Transitions only move forward.
 *
 * - undiscovered: the algorithm has not reached it yet.
 * - discovered:   reached, and waiting in the algorithm's working set.
 * - processing:   the algorithm is working on it right now.
 * - processed:    finished; the algorithm will not change its answer again.
 *
 * `traversal.ts` documents what the four states mean for BFS and DFS; each
 * other engine documents its own mapping in its module header.
 */
export type VertexMark = 'undiscovered' | 'discovered' | 'processing' | 'processed';

/**
 * - idle:     not part of the answer and not being looked at.
 * - active:   being examined in this step.
 * - tree:     part of the answer being built (traversal tree, shortest-path
 *             tree, spanning tree).
 * - rejected: examined and ruled out (already-reached neighbour, edge that
 *             would close a cycle, relaxation that changed nothing).
 */
export type EdgeMark = 'idle' | 'active' | 'tree' | 'rejected';

/** One value in a step table. Numbers stay numbers so the UI can format them. */
export type StepCell =
  | { readonly kind: 'number'; readonly value: number }
  /** An unreachable distance; shown as ∞. */
  | { readonly kind: 'infinity' }
  /** Language-neutral text, e.g. a vertex label. */
  | { readonly kind: 'text'; readonly text: string }
  /** No value yet; shown as a dash. */
  | { readonly kind: 'empty' };

/**
 * A table header, either a language-neutral label (a vertex label) or a
 * translation key, because some tables are indexed by vertex and others by
 * concept ("distance", "predecessor").
 */
export type StepHeader =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'key'; readonly key: string };

export interface StepRow {
  readonly header: StepHeader;
  readonly cells: readonly StepCell[];
}

/** A small table for the side panel (distances, in-degrees, a matrix). */
export interface StepTable {
  readonly titleKey: string;
  /** Column headers; empty when the table has a single unnamed column. */
  readonly columns: readonly StepHeader[];
  readonly rows: readonly StepRow[];
  /** Header text of the row/column this step works on; highlighted in the UI. */
  readonly activeRow?: string;
  readonly activeColumn?: string;
}

/** An ordered or unordered collection for the side panel (queue, stack, order). */
export interface StepList {
  readonly titleKey: string;
  /** Interpolation values for `titleKey`, e.g. the number of a component. */
  readonly titleValues?: Readonly<Record<string, string | number>>;
  readonly items: readonly string[];
  /** True when position matters, so the UI separates items with arrows. */
  readonly ordered: boolean;
  readonly hintKey?: string;
}

/** Stable name of the operation a step performed; asserted on in tests. */
export type StepOp =
  | 'start'
  | 'dequeue'
  | 'discover'
  | 'skipNeighbor'
  | 'finish'
  | 'restart'
  | 'select'
  | 'relax'
  | 'noChange'
  | 'pass'
  | 'pivot'
  | 'probe'
  | 'improve'
  | 'consider'
  | 'accept'
  | 'reject'
  | 'emit'
  | 'negativeCycle'
  | 'cycleDetected'
  | 'complete';

export interface AlgorithmStep {
  readonly index: number;
  readonly op: StepOp;
  readonly explanation: MessageDescriptor;
  readonly vertexMarks: Readonly<Record<VertexId, VertexMark>>;
  /** Extra per-vertex text drawn next to the vertex (order number, component). */
  readonly vertexBadges: Readonly<Record<VertexId, string>>;
  readonly edgeMarks: Readonly<Record<EdgeId, EdgeMark>>;
  readonly tables: readonly StepTable[];
  readonly lists: readonly StepList[];
  /** Findings that must stay visible, e.g. a negative cycle or a cycle in a DAG. */
  readonly notices: readonly MessageDescriptor[];
}

/** Complete, precomputed execution. Playback only moves an index over it. */
export interface AlgorithmTrace<Result = unknown> {
  readonly algorithm: AlgorithmId;
  readonly graph: Graph;
  /** The vertex the run started from, or `null` for algorithms without one. */
  readonly startVertex: VertexId | null;
  /** Never empty: there is always at least a first and a final step. */
  readonly steps: readonly AlgorithmStep[];
  readonly result: Result;
}

export const headerText = (text: string): StepHeader => ({ kind: 'text', text });
export const headerKey = (key: string): StepHeader => ({ kind: 'key', key });

export const cellNumber = (value: number): StepCell => ({ kind: 'number', value });
export const cellText = (text: string): StepCell => ({ kind: 'text', text });
export const cellEmpty: StepCell = { kind: 'empty' };

/** A distance cell: a finite number, or ∞ when the vertex is not reached yet. */
export function cellDistance(value: number): StepCell {
  return Number.isFinite(value) ? cellNumber(value) : { kind: 'infinity' };
}

/** A cell holding a vertex label, or a dash when there is no vertex. */
export function cellLabel(label: string | null | undefined): StepCell {
  return label ? cellText(label) : cellEmpty;
}

export function finalStep(trace: AlgorithmTrace): AlgorithmStep {
  return trace.steps[trace.steps.length - 1]!;
}
