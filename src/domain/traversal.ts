import type { Edge, Graph, VertexId } from './graph';
import type { MessageDescriptor } from './messages';

export type TraversalAlgorithm = 'bfs' | 'dfs';

/** BFS uses a FIFO queue; iterative DFS uses an explicit LIFO stack. */
export type FrontierKind = 'queue' | 'stack';

export const FRONTIER_KIND: Readonly<Record<TraversalAlgorithm, FrontierKind>> = {
  bfs: 'queue',
  dfs: 'stack',
};

/**
 * Vertex lifecycle. Transitions only move forward:
 *   undiscovered → discovered → processing → processed
 *
 * - undiscovered: not yet reached.
 * - discovered:   reached and added to the frontier; neighbor examination not started.
 * - processing:   neighbor examination started but not finished.
 * - processed:    every neighbor examined; the traversal never returns to it.
 *
 * BFS: a vertex is discovered when it is enqueued (marking on enqueue prevents
 * duplicates in the queue), becomes processing when dequeued, and processed
 * once all its neighbors have been examined.
 *
 * DFS (iterative, explicit stack of frames): the stack holds the vertices whose
 * examination has started and not finished — exactly the recursion stack of
 * recursive DFS. Each frame remembers the next neighbor to examine. Pushing a
 * vertex discovers it and starts its processing in the same operation, so in
 * DFS a vertex passes through `discovered` instantaneously; it is processed
 * when its frame is popped. This reproduces the recursive DFS visitation order
 * for the given neighbor ordering. (The common variant that pushes all
 * neighbors at once produces a different order and is NOT what is modelled.)
 *
 * A traversal covers only the connected component of the start vertex; it
 * never restarts in another component.
 */
export type VertexState = 'undiscovered' | 'discovered' | 'processing' | 'processed';

/** Atomic operation that produced a snapshot. Finalized in Milestone 2. */
export type TraversalOperation =
  | { readonly type: 'start'; readonly vertex: VertexId }
  /** BFS only: remove the front of the queue and begin processing it. */
  | { readonly type: 'dequeue'; readonly vertex: VertexId }
  /** Undiscovered neighbor found via `edge`: BFS enqueues it, DFS pushes it. */
  | { readonly type: 'discover'; readonly vertex: VertexId; readonly parent: VertexId; readonly edge: Edge }
  /** Neighbor already reached: nothing is added to the frontier (no duplicates). */
  | {
      readonly type: 'skipNeighbor';
      readonly vertex: VertexId;
      readonly from: VertexId;
      readonly edge: Edge;
      readonly neighborState: Exclude<VertexState, 'undiscovered'>;
    }
  /** All neighbors examined. DFS also pops the vertex from the stack. */
  | { readonly type: 'finish'; readonly vertex: VertexId }
  | { readonly type: 'complete' };

/** Immutable state of an execution after one operation. */
export interface TraversalSnapshot {
  readonly index: number;
  readonly operation: TraversalOperation;
  readonly vertexStates: Readonly<Record<VertexId, VertexState>>;
  /** Queue: index 0 is the front. Stack: the last element is the top. */
  readonly frontier: readonly VertexId[];
  readonly current: VertexId | null;
  readonly activeEdge: Edge | null;
  readonly discoveryOrder: readonly VertexId[];
  readonly finishOrder: readonly VertexId[];
  /** Traversal-tree parent; `null` for the start vertex; absent if undiscovered. */
  readonly parent: Readonly<Record<VertexId, VertexId | null>>;
  /**
   * BFS only: number of edges on a shortest path from the start vertex
   * (valid because the graph is unweighted). Absent for DFS.
   */
  readonly distance?: Readonly<Record<VertexId, number>>;
  readonly explanation: MessageDescriptor;
}

/** Complete, precomputed execution. Playback only moves an index over it. */
export interface TraversalTrace {
  readonly algorithm: TraversalAlgorithm;
  readonly graph: Graph;
  readonly startVertex: VertexId;
  readonly snapshots: readonly TraversalSnapshot[];
}
