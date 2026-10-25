import { useCallback, useEffect, useMemo, useState } from 'react';
import { type AlgorithmDefinition, type PrerequisiteKind, getAlgorithm, isApplicable, unmetPrerequisites } from '../domain/algorithms';
import { type GraphDraft, draftFromGenerator } from '../domain/editing';
import { DEFAULT_GENERATOR_OPTIONS } from '../domain/generator';
import type { VertexId } from '../domain/graph';
import type { AlgorithmId, AlgorithmStep, AlgorithmTrace } from '../domain/trace';

/** Milliseconds between steps while playing, slowest first. */
export const SPEEDS = [2000, 1100, 500] as const;
export type SpeedIndex = 0 | 1 | 2;

export interface GraphLab {
  readonly draft: GraphDraft;
  readonly algorithmId: AlgorithmId;
  readonly definition: AlgorithmDefinition;
  readonly startVertex: VertexId | null;
  /** Null when the algorithm cannot run on the current graph. */
  readonly trace: AlgorithmTrace | null;
  readonly step: AlgorithmStep | null;
  readonly index: number;
  readonly stepCount: number;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly playing: boolean;
  readonly speed: SpeedIndex;
  readonly unmet: readonly PrerequisiteKind[];
  /** Set when the algorithm is applicable but no start vertex is chosen yet. */
  readonly needsStartVertex: boolean;
  readonly setAlgorithm: (id: AlgorithmId) => void;
  readonly setStartVertex: (id: VertexId | null) => void;
  /** Replaces the graph; playback restarts because the old trace no longer applies. */
  readonly updateDraft: (next: GraphDraft) => void;
  readonly goTo: (index: number) => void;
  readonly next: () => void;
  readonly previous: () => void;
  readonly restart: () => void;
  readonly togglePlay: () => void;
  readonly setSpeed: (speed: SpeedIndex) => void;
}

/**
 * Holds the graph, the chosen algorithm and the playback position.
 *
 * The trace is computed once per (graph, algorithm, start vertex) and cached;
 * playback only moves `index` over it, so stepping backwards is exact and
 * animation cannot influence the result. Any change to the graph invalidates
 * the trace and sends playback back to the first step.
 */
export function useGraphLab(): GraphLab {
  const [draft, setDraft] = useState<GraphDraft>(() => draftFromGenerator(DEFAULT_GENERATOR_OPTIONS, 'circle'));
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>('bfs');
  const [startVertex, setStartVertexState] = useState<VertexId | null>(() => null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedIndex>(1);

  const definition = getAlgorithm(algorithmId);
  const unmet = unmetPrerequisites(definition, draft.graph);

  // Keep the start vertex pointing at a vertex that exists.
  const effectiveStart = useMemo(() => {
    if (!definition.needsStartVertex) return null;
    if (startVertex && draft.graph.vertices.some((v) => v.id === startVertex)) return startVertex;
    return draft.graph.vertices[0]?.id ?? null;
  }, [definition.needsStartVertex, draft.graph.vertices, startVertex]);

  const trace = useMemo(() => {
    if (!isApplicable(definition, draft.graph)) return null;
    if (definition.needsStartVertex && effectiveStart === null) return null;
    return definition.run(draft.graph, effectiveStart);
  }, [definition, draft.graph, effectiveStart]);

  const stepCount = trace?.steps.length ?? 0;
  const clamped = Math.min(index, Math.max(stepCount - 1, 0));
  const step = trace?.steps[clamped] ?? null;
  const atEnd = stepCount === 0 || clamped >= stepCount - 1;
  const atStart = clamped === 0;

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, Math.max(stepCount - 1, 0))), [stepCount]);
  const previous = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const restart = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);

  // `clamped` is in the dependencies on purpose: each step schedules the next
  // one, so leaving it out would stop playback after a single step.
  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(next, SPEEDS[speed]);
    return () => window.clearTimeout(timer);
  }, [playing, atEnd, next, speed, clamped]);

  const updateDraft = useCallback((nextDraft: GraphDraft) => {
    setDraft(nextDraft);
    setIndex(0);
    setPlaying(false);
  }, []);

  const setAlgorithm = useCallback((id: AlgorithmId) => {
    setAlgorithmId(id);
    setIndex(0);
    setPlaying(false);
  }, []);

  const setStartVertex = useCallback((id: VertexId | null) => {
    setStartVertexState(id);
    setIndex(0);
    setPlaying(false);
  }, []);

  return {
    draft,
    algorithmId,
    definition,
    startVertex: effectiveStart,
    trace,
    step,
    index: clamped,
    stepCount,
    atStart,
    atEnd,
    playing,
    speed,
    unmet,
    needsStartVertex: definition.needsStartVertex && effectiveStart === null,
    setAlgorithm,
    setStartVertex,
    updateDraft,
    goTo: (value: number) => setIndex(value),
    next,
    previous,
    restart,
    togglePlay: () => setPlaying((value) => !value),
    setSpeed,
  };
}
