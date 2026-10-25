/**
 * Step recorder shared by every engine.
 *
 * Engines keep mutable working state (marks, distances, a frontier) and call
 * `record` after each atomic operation. The recorder copies what it is given,
 * so a recorded step can never be changed by later work: the finished trace is
 * immutable even though the engine that built it was not.
 */

import type { EdgeId, VertexId } from './graph';
import type { MessageDescriptor } from './messages';
import type { AlgorithmStep, EdgeMark, StepList, StepOp, StepTable, VertexMark } from './trace';

export interface StepDraft {
  readonly op: StepOp;
  readonly explanation: MessageDescriptor;
  readonly vertexMarks: Readonly<Record<VertexId, VertexMark>>;
  readonly edgeMarks: Readonly<Record<EdgeId, EdgeMark>>;
  readonly vertexBadges?: Readonly<Record<VertexId, string>>;
  readonly tables?: readonly StepTable[];
  readonly lists?: readonly StepList[];
  readonly notices?: readonly MessageDescriptor[];
}

export interface Recorder {
  readonly steps: readonly AlgorithmStep[];
  readonly record: (draft: StepDraft) => void;
}

export function createRecorder(): Recorder {
  const steps: AlgorithmStep[] = [];
  return {
    steps,
    record(draft) {
      steps.push({
        index: steps.length,
        op: draft.op,
        explanation: draft.explanation,
        vertexMarks: { ...draft.vertexMarks },
        vertexBadges: { ...(draft.vertexBadges ?? {}) },
        edgeMarks: { ...draft.edgeMarks },
        tables: draft.tables ?? [],
        lists: draft.lists ?? [],
        notices: draft.notices ?? [],
      });
    },
  };
}
