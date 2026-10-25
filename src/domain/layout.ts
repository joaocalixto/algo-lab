/**
 * Vertex placement. Pure geometry: a layout is a hint for drawing and never
 * reaches an algorithm, so moving a vertex can never change a result.
 *
 * Both layouts are deterministic — same graph, same positions — so a learner
 * who reloads or re-arranges sees a stable picture.
 */

import type { Graph, GraphLayout, Point, VertexId } from './graph';

export type LayoutKind = 'circle' | 'force';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  /** Space kept free at the border so vertex circles and labels fit. */
  readonly padding: number;
}

export const CANVAS: Viewport = { width: 820, height: 520, padding: 60 };

/** Vertices evenly spaced around a circle, in declaration order, starting at the top. */
export function circleLayout(graph: Graph, viewport: Viewport = CANVAS): GraphLayout {
  const count = graph.vertices.length;
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  if (count === 1) return { [graph.vertices[0]!.id]: { x: centerX, y: centerY } };
  const radius = Math.min(viewport.width, viewport.height) / 2 - viewport.padding;
  const positions: Record<VertexId, Point> = {};
  graph.vertices.forEach((vertex, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions[vertex.id] = { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  });
  return positions;
}

const FORCE_ITERATIONS = 300;

/**
 * Spring layout (Fruchterman–Reingold): edges pull their endpoints together,
 * every pair of vertices pushes apart, and the step size cools down linearly.
 * Seeded from `circleLayout`, with a fixed iteration count and no randomness,
 * so the result is reproducible.
 */
export function forceLayout(graph: Graph, viewport: Viewport = CANVAS): GraphLayout {
  const count = graph.vertices.length;
  if (count < 3) return circleLayout(graph, viewport);

  const innerWidth = viewport.width - 2 * viewport.padding;
  const innerHeight = viewport.height - 2 * viewport.padding;
  const ideal = Math.sqrt((innerWidth * innerHeight) / count);
  const start = circleLayout(graph, viewport);
  const xs = graph.vertices.map((v) => start[v.id]!.x);
  const ys = graph.vertices.map((v) => start[v.id]!.y);
  const index = new Map(graph.vertices.map((v, i) => [v.id, i]));

  for (let iteration = 0; iteration < FORCE_ITERATIONS; iteration++) {
    const temperature = (innerWidth / 10) * (1 - iteration / FORCE_ITERATIONS);
    const dxs = new Array<number>(count).fill(0);
    const dys = new Array<number>(count).fill(0);

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let dx = xs[i]! - xs[j]!;
        let dy = ys[i]! - ys[j]!;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.01) {
          // Coincident vertices: nudge them apart along a fixed direction.
          dx = (i % 2 === 0 ? 1 : -1) * 0.5;
          dy = 0.5;
          distance = Math.hypot(dx, dy);
        }
        const repulsion = (ideal * ideal) / distance;
        const ux = dx / distance;
        const uy = dy / distance;
        dxs[i]! += ux * repulsion;
        dys[i]! += uy * repulsion;
        dxs[j]! -= ux * repulsion;
        dys[j]! -= uy * repulsion;
      }
    }

    for (const edge of graph.edges) {
      const a = index.get(edge.from);
      const b = index.get(edge.to);
      if (a === undefined || b === undefined) continue;
      const dx = xs[a]! - xs[b]!;
      const dy = ys[a]! - ys[b]!;
      const distance = Math.max(Math.hypot(dx, dy), 0.01);
      const attraction = (distance * distance) / ideal;
      const ux = dx / distance;
      const uy = dy / distance;
      dxs[a]! -= ux * attraction;
      dys[a]! -= uy * attraction;
      dxs[b]! += ux * attraction;
      dys[b]! += uy * attraction;
    }

    for (let i = 0; i < count; i++) {
      const length = Math.max(Math.hypot(dxs[i]!, dys[i]!), 0.01);
      const step = Math.min(length, temperature);
      xs[i] = clamp(xs[i]! + (dxs[i]! / length) * step, viewport.padding, viewport.width - viewport.padding);
      ys[i] = clamp(ys[i]! + (dys[i]! / length) * step, viewport.padding, viewport.height - viewport.padding);
    }
  }

  const positions: Record<VertexId, Point> = {};
  graph.vertices.forEach((vertex, i) => {
    positions[vertex.id] = { x: round(xs[i]!), y: round(ys[i]!) };
  });
  return positions;
}

export function layoutGraph(graph: Graph, kind: LayoutKind, viewport: Viewport = CANVAS): GraphLayout {
  return kind === 'force' ? forceLayout(graph, viewport) : circleLayout(graph, viewport);
}

/** Keeps a point inside the drawing area; used while dragging a vertex. */
export function clampToViewport(point: Point, viewport: Viewport = CANVAS): Point {
  return {
    x: round(clamp(point.x, viewport.padding / 2, viewport.width - viewport.padding / 2)),
    y: round(clamp(point.y, viewport.padding / 2, viewport.height - viewport.padding / 2)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
