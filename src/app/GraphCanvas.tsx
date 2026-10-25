import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { GraphDraft } from '../domain/editing';
import type { Edge, EdgeId, Point, VertexId } from '../domain/graph';
import { CANVAS } from '../domain/layout';
import type { AlgorithmStep, EdgeMark, VertexMark } from '../domain/trace';

const VERTEX_RADIUS = 24;
/** Sideways offset of a curved edge, used when both orientations exist. */
const CURVE_OFFSET = 26;
/** Distance a vertex moves per arrow key press. */
const KEYBOARD_STEP = 16;

/**
 * State is never conveyed by colour alone: each vertex mark also has its own
 * outline pattern and glyph, and each edge mark its own dash pattern and width
 * (see `tokens.css`). Every vertex is a focusable button with a label that
 * spells out its state, so the drawing is usable from the keyboard and with a
 * screen reader; the vertex and edge tables below the canvas are the
 * non-graphical equivalent of everything shown here.
 */
const VERTEX_GLYPH: Readonly<Record<VertexMark, string>> = {
  undiscovered: '',
  discovered: '•',
  processing: '▶',
  processed: '✓',
};

export interface GraphCanvasProps {
  readonly draft: GraphDraft;
  readonly step: AlgorithmStep | null;
  readonly startVertex: VertexId | null;
  /** Edit mode: clicking the canvas adds a vertex, clicking vertices links them. */
  readonly editable: boolean;
  readonly selectedVertex: VertexId | null;
  readonly onCanvasClick?: (point: Point) => void;
  readonly onVertexActivate?: (id: VertexId) => void;
  readonly onVertexMove?: (id: VertexId, point: Point) => void;
  readonly onVertexDelete?: (id: VertexId) => void;
  readonly onEdgeActivate?: (id: EdgeId) => void;
}

export function GraphCanvas(props: GraphCanvasProps) {
  const { draft, step, editable, selectedVertex, startVertex } = props;
  const { t } = useTranslation('explorer');
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<VertexId | null>(null);

  const { graph, layout } = draft;
  const markOf = (id: VertexId): VertexMark => step?.vertexMarks[id] ?? 'undiscovered';
  const edgeMarkOf = (id: EdgeId): EdgeMark => step?.edgeMarks[id] ?? 'idle';
  const badgeOf = (id: VertexId): string => step?.vertexBadges[id] ?? '';

  const toCanvasPoint = (event: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const matrix = svg.getScreenCTM?.();
    if (matrix) {
      const origin = svg.createSVGPoint();
      origin.x = event.clientX;
      origin.y = event.clientY;
      const mapped = origin.matrixTransform(matrix.inverse());
      return { x: mapped.x, y: mapped.y };
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS.width,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS.height,
    };
  };

  const handleVertexKeyDown = (event: KeyboardEvent<SVGGElement>, id: VertexId): void => {
    const position = layout[id];
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onVertexActivate?.(id);
      return;
    }
    if (!editable || !position) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      props.onVertexDelete?.(id);
      return;
    }
    const moves: Readonly<Record<string, Point>> = {
      ArrowUp: { x: 0, y: -KEYBOARD_STEP },
      ArrowDown: { x: 0, y: KEYBOARD_STEP },
      ArrowLeft: { x: -KEYBOARD_STEP, y: 0 },
      ArrowRight: { x: KEYBOARD_STEP, y: 0 },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    props.onVertexMove?.(id, { x: position.x + move.x, y: position.y + move.y });
  };

  const handlePointerDown = (event: PointerEvent<SVGGElement>, id: VertexId): void => {
    if (!editable) return;
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    setDragging(id);
  };

  const handlePointerMove = (event: PointerEvent<SVGGElement>): void => {
    if (!dragging) return;
    props.onVertexMove?.(dragging, toCanvasPoint(event));
  };

  const handlePointerUp = (event: PointerEvent<SVGGElement>, id: VertexId): void => {
    if (!dragging) return;
    const moved = layout[id];
    const dropped = toCanvasPoint(event);
    setDragging(null);
    // A press that did not move is a click: it selects the vertex instead.
    if (moved && Math.hypot(moved.x - dropped.x, moved.y - dropped.y) < 3) props.onVertexActivate?.(id);
  };

  return (
    <svg
      ref={svgRef}
      className="graph-canvas"
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="group"
      aria-label={t('canvas.label', { vertices: graph.vertices.length, edges: graph.edges.length })}
      onClick={(event) => {
        if (!editable || event.target !== svgRef.current) return;
        props.onCanvasClick?.(toCanvasPoint(event));
      }}
    >
      <defs>
        {(['idle', 'active', 'tree', 'rejected'] as const).map((mark) => (
          <marker
            key={mark}
            id={`arrow-${mark}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10Z" className={`arrow arrow-${mark}`} />
          </marker>
        ))}
      </defs>

      {graph.edges.map((edge) => (
        <EdgeShape
          key={edge.id}
          edge={edge}
          draft={draft}
          mark={edgeMarkOf(edge.id)}
          interactive={editable}
          onActivate={props.onEdgeActivate}
          describe={(mark) => t(`edgeMark.${mark}`)}
        />
      ))}

      {graph.vertices.map((vertex) => {
        const position = layout[vertex.id];
        if (!position) return null;
        const mark = markOf(vertex.id);
        const badge = badgeOf(vertex.id);
        const isStart = startVertex === vertex.id;
        const isSelected = selectedVertex === vertex.id;
        return (
          <g
            key={vertex.id}
            className={`vertex vertex-${mark}${isSelected ? ' vertex-selected' : ''}${dragging === vertex.id ? ' vertex-dragging' : ''}`}
            transform={`translate(${position.x} ${position.y})`}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={t('canvas.vertexLabel', {
              label: vertex.label,
              state: t(`vertexState.${mark}`),
              extra: [
                isStart ? t('canvas.isStart') : '',
                badge ? t('canvas.badge', { badge }) : '',
                isSelected ? t('canvas.isSelected') : '',
              ]
                .filter(Boolean)
                .join(', '),
            })}
            onKeyDown={(event) => handleVertexKeyDown(event, vertex.id)}
            onPointerDown={(event) => handlePointerDown(event, vertex.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => handlePointerUp(event, vertex.id)}
            onClick={(event) => event.stopPropagation()}
          >
            {isStart && <circle className="vertex-start-ring" r={VERTEX_RADIUS + 6} />}
            <circle className="vertex-body" r={VERTEX_RADIUS} />
            <text className="vertex-label" y="6" textAnchor="middle">
              {vertex.label}
            </text>
            {VERTEX_GLYPH[mark] && (
              <text className="vertex-glyph" x={VERTEX_RADIUS - 2} y={-VERTEX_RADIUS + 6} textAnchor="middle" aria-hidden="true">
                {VERTEX_GLYPH[mark]}
              </text>
            )}
            {badge && (
              <text className="vertex-badge" x={-VERTEX_RADIUS + 2} y={-VERTEX_RADIUS + 6} textAnchor="middle" aria-hidden="true">
                {badge}
              </text>
            )}
            {step && (
              <text className="vertex-state" y={VERTEX_RADIUS + 18} textAnchor="middle" aria-hidden="true">
                {t(`vertexState.${mark}`)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface EdgeShapeProps {
  readonly edge: Edge;
  readonly draft: GraphDraft;
  readonly mark: EdgeMark;
  readonly interactive: boolean;
  readonly onActivate: ((id: EdgeId) => void) | undefined;
  readonly describe: (mark: EdgeMark) => string;
}

function EdgeShape({ edge, draft, mark, interactive, onActivate, describe }: EdgeShapeProps) {
  const { graph, layout } = draft;
  const from = layout[edge.from];
  const to = layout[edge.to];
  if (!from || !to) return null;

  // Both orientations of a pair would overlap, so each is drawn as an arc.
  const paired = graph.directed && graph.edges.some((e) => e.from === edge.to && e.to === edge.from);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const ux = dx / length;
  const uy = dy / length;
  const start = { x: from.x + ux * VERTEX_RADIUS, y: from.y + uy * VERTEX_RADIUS };
  const end = { x: to.x - ux * VERTEX_RADIUS, y: to.y - uy * VERTEX_RADIUS };
  const control = {
    x: (from.x + to.x) / 2 - uy * CURVE_OFFSET,
    y: (from.y + to.y) / 2 + ux * CURVE_OFFSET,
  };
  const path = paired
    ? `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const midpoint = paired
    ? { x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x, y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y }
    : { x: (start.x + end.x) / 2 - uy * 14, y: (start.y + end.y) / 2 + ux * 14 };

  return (
    <g className={`edge edge-${mark}`}>
      <path
        className="edge-line"
        d={path}
        fill="none"
        {...(graph.directed ? { markerEnd: `url(#arrow-${mark})` } : {})}
      />
      {interactive && (
        <path
          className="edge-hit"
          d={path}
          fill="none"
          role="button"
          tabIndex={0}
          aria-label={`${edge.from} → ${edge.to}${graph.weighted ? ` (${edge.weight})` : ''} — ${describe(mark)}`}
          onClick={(event) => {
            event.stopPropagation();
            onActivate?.(edge.id);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onActivate?.(edge.id);
          }}
        />
      )}
      {graph.weighted && (
        <>
          <rect className="edge-weight-box" x={midpoint.x - 15} y={midpoint.y - 12} width="30" height="22" rx="6" />
          <text className="edge-weight" x={midpoint.x} y={midpoint.y + 4} textAnchor="middle" aria-hidden="true">
            {edge.weight}
          </text>
        </>
      )}
    </g>
  );
}
