import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type GraphDraft,
  addEdge,
  addVertex,
  clearGraph,
  draftFromGenerator,
  relayout,
  removeEdge,
  removeVertex,
  reverseEdge,
  setEdgeWeight,
  setKind,
} from '../domain/editing';
import {
  type GeneratorOptions,
  DEFAULT_GENERATOR_OPTIONS,
  MAX_VERTICES,
  MIN_VERTICES,
  generatorLimits,
  validateGeneratorOptions,
  willBeConnected,
} from '../domain/generator';
import type { EdgeId, Point, VertexId } from '../domain/graph';
import { CANVAS, type LayoutKind } from '../domain/layout';
import { randomSeed } from '../domain/random';
import { GraphCanvas } from './GraphCanvas';
import type { AlgorithmStep } from '../domain/trace';

export type BuilderMode = 'generate' | 'edit';

export interface GraphBuilderProps {
  readonly draft: GraphDraft;
  readonly onChange: (draft: GraphDraft) => void;
  readonly step: AlgorithmStep | null;
  readonly startVertex: VertexId | null;
  readonly onStartVertexChange: (id: VertexId) => void;
  readonly running: boolean;
}

/**
 * Graph creation: a random generator and a manual editor over the same model
 * and the same canvas, so a generated graph can be edited by hand right away.
 *
 * Everything that can be done by clicking the canvas can also be done from the
 * forms and tables below it (add vertex, link two vertices, change a weight,
 * delete, re-arrange), which is what makes the editor usable with a keyboard
 * and with a screen reader.
 */
export function GraphBuilder({ draft, onChange, step, startVertex, onStartVertexChange, running }: GraphBuilderProps) {
  const { t } = useTranslation('explorer');
  const ids = useId();
  const [mode, setMode] = useState<BuilderMode>('generate');
  const [options, setOptions] = useState<GeneratorOptions>(DEFAULT_GENERATOR_OPTIONS);
  const [layoutKind, setLayoutKind] = useState<LayoutKind>('circle');
  const [selected, setSelected] = useState<VertexId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<VertexId | ''>('');
  const [linkTo, setLinkTo] = useState<VertexId | ''>('');
  const [linkWeight, setLinkWeight] = useState('1');

  const { graph } = draft;
  const limits = generatorLimits(options.vertexCount, options.directed);
  const problems = validateGeneratorOptions(options);
  const editable = mode === 'edit' && !running;

  const update = (next: GraphDraft, note?: string): void => {
    onChange(next);
    setMessage(note ?? null);
  };

  const generate = (seed: number): void => {
    const next = { ...options, seed };
    setOptions(next);
    if (validateGeneratorOptions(next).length > 0) return;
    update(draftFromGenerator(next, layoutKind, CANVAS), t('builder.generated', { vertices: next.vertexCount, edges: next.edgeCount }));
  };

  const handleVertexActivate = (id: VertexId): void => {
    if (!editable) {
      onStartVertexChange(id);
      return;
    }
    if (selected === null) {
      setSelected(id);
      setMessage(t('builder.vertexSelected', { label: labelOf(id) }));
      return;
    }
    if (selected === id) {
      setSelected(null);
      setMessage(null);
      return;
    }
    const result = addEdge(draft, selected, id, Number(linkWeight) || 1);
    setSelected(null);
    if (result.problem) setMessage(t(`builder.problem.${result.problem}`));
    else update(result.draft, t('builder.edgeAdded', { from: labelOf(selected), to: labelOf(id) }));
  };

  const handleCanvasClick = (point: Point): void => {
    if (!editable) return;
    const result = addVertex(draft, point);
    if (result.problem) setMessage(t(`builder.problem.${result.problem}`));
    else update(result.draft, t('builder.vertexAdded'));
  };

  const addVertexAtFreeSpot = (): void => {
    // Keyboard equivalent of clicking the canvas: place it on a spiral of free spots.
    const count = graph.vertices.length;
    const angle = count * 0.9;
    const point = {
      x: CANVAS.width / 2 + Math.cos(angle) * (90 + count * 12),
      y: CANVAS.height / 2 + Math.sin(angle) * (70 + count * 9),
    };
    const result = addVertex(draft, point);
    if (result.problem) setMessage(t(`builder.problem.${result.problem}`));
    else update(result.draft, t('builder.vertexAdded'));
  };

  const labelOf = (id: VertexId): string => graph.vertices.find((v) => v.id === id)?.label ?? id;

  const link = (): void => {
    if (!linkFrom || !linkTo) return;
    const result = addEdge(draft, linkFrom, linkTo, Number(linkWeight) || 1);
    if (result.problem) setMessage(t(`builder.problem.${result.problem}`));
    else update(result.draft, t('builder.edgeAdded', { from: labelOf(linkFrom), to: labelOf(linkTo) }));
  };

  const deleteEdge = (id: EdgeId): void => update(removeEdge(draft, id), t('builder.edgeRemoved'));

  return (
    <section className="builder" aria-labelledby={`${ids}-title`}>
      <div className="builder-head">
        <h2 id={`${ids}-title`}>{t('builder.title')}</h2>
        <fieldset className="mode-switch">
          <legend className="visually-hidden">{t('builder.mode')}</legend>
          {(['generate', 'edit'] as const).map((value) => (
            <label key={value}>
              <input type="radio" name={`${ids}-mode`} value={value} checked={mode === value} onChange={() => setMode(value)} />
              {t(`builder.modes.${value}`)}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="builder-kinds">
        <fieldset>
          <legend>{t('builder.direction')}</legend>
          {(['undirected', 'directed'] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={`${ids}-direction`}
                checked={graph.directed === (value === 'directed')}
                onChange={() => {
                  const directed = value === 'directed';
                  setOptions({ ...options, directed });
                  update(setKind(draft, { directed }), t('builder.kindChanged'));
                }}
              />
              {t(`builder.${value}`)}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{t('builder.weights')}</legend>
          {(['unweighted', 'weighted'] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={`${ids}-weights`}
                checked={graph.weighted === (value === 'weighted')}
                onChange={() => {
                  const weighted = value === 'weighted';
                  setOptions({ ...options, weighted });
                  update(setKind(draft, { weighted }), t('builder.kindChanged'));
                }}
              />
              {t(`builder.${value}`)}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor={`${ids}-layout`}>{t('builder.layout')}</label>
          <select
            id={`${ids}-layout`}
            value={layoutKind}
            onChange={(event) => {
              const kind = event.target.value as LayoutKind;
              setLayoutKind(kind);
              update(relayout(draft, kind, CANVAS), t('builder.rearranged'));
            }}
          >
            <option value="circle">{t('builder.layoutCircle')}</option>
            <option value="force">{t('builder.layoutForce')}</option>
          </select>
        </div>
      </div>

      {mode === 'generate' ? (
        <div className="generator-form">
          <div className="field">
            <label htmlFor={`${ids}-vertices`}>{t('builder.vertexCount')}</label>
            <input
              id={`${ids}-vertices`}
              type="number"
              min={MIN_VERTICES}
              max={MAX_VERTICES}
              value={options.vertexCount}
              onChange={(event) => setOptions({ ...options, vertexCount: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${ids}-edges`}>{t('builder.edgeCount')}</label>
            <input
              id={`${ids}-edges`}
              type="number"
              min={0}
              max={limits.maxEdges}
              value={options.edgeCount}
              aria-describedby={`${ids}-edge-hint`}
              onChange={(event) => setOptions({ ...options, edgeCount: Number(event.target.value) })}
            />
            <small id={`${ids}-edge-hint`}>
              {t('builder.edgeRange', { max: limits.maxEdges, connected: limits.connectedThreshold })}
            </small>
          </div>
          <div className="field">
            <label htmlFor={`${ids}-seed`}>{t('builder.seed')}</label>
            <input
              id={`${ids}-seed`}
              type="number"
              min={1}
              value={options.seed}
              onChange={(event) => setOptions({ ...options, seed: Number(event.target.value) })}
            />
          </div>
          {graph.weighted && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={options.allowNegativeWeights}
                onChange={(event) => setOptions({ ...options, allowNegativeWeights: event.target.checked })}
              />
              {t('builder.allowNegative')}
            </label>
          )}
          <div className="builder-actions">
            <button type="button" className="primary-button" disabled={problems.length > 0} onClick={() => generate(options.seed)}>
              {t('builder.generate')}
            </button>
            <button type="button" onClick={() => generate(randomSeed())}>
              {t('builder.generateRandom')}
            </button>
          </div>
          {problems.length > 0 ? (
            <p className="notice" role="alert">
              {problems
                .map((problem) =>
                  problem.kind === 'tooManyEdges'
                    ? t('builder.problem.tooManyEdges', { max: problem.maxEdges })
                    : problem.kind === 'vertexCountOutOfRange'
                      ? t('builder.problem.vertexCountOutOfRange', { min: problem.min, max: problem.max })
                      : t('builder.problem.negativeEdgeCount'),
                )
                .join(' ')}
            </p>
          ) : (
            <p className="hint">{willBeConnected(options) ? t('builder.willConnect') : t('builder.willNotConnect')}</p>
          )}
        </div>
      ) : (
        <div className="editor-form">
          <p className="hint">{t('builder.editHelp')}</p>
          <div className="builder-actions">
            <button type="button" onClick={addVertexAtFreeSpot}>
              {t('builder.addVertex')}
            </button>
            <button type="button" onClick={() => update(clearGraph(draft), t('builder.cleared'))}>
              {t('builder.clear')}
            </button>
          </div>
          <fieldset className="link-form">
            <legend>{t('builder.addEdge')}</legend>
            <div className="field">
              <label htmlFor={`${ids}-from`}>{t('builder.from')}</label>
              <select id={`${ids}-from`} value={linkFrom} onChange={(event) => setLinkFrom(event.target.value)}>
                <option value="">—</option>
                {graph.vertices.map((vertex) => (
                  <option key={vertex.id} value={vertex.id}>
                    {vertex.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${ids}-to`}>{t('builder.to')}</label>
              <select id={`${ids}-to`} value={linkTo} onChange={(event) => setLinkTo(event.target.value)}>
                <option value="">—</option>
                {graph.vertices.map((vertex) => (
                  <option key={vertex.id} value={vertex.id}>
                    {vertex.label}
                  </option>
                ))}
              </select>
            </div>
            {graph.weighted && (
              <div className="field">
                <label htmlFor={`${ids}-weight`}>{t('builder.weight')}</label>
                <input id={`${ids}-weight`} type="number" value={linkWeight} onChange={(event) => setLinkWeight(event.target.value)} />
              </div>
            )}
            <button type="button" disabled={!linkFrom || !linkTo} onClick={link}>
              {t('builder.link')}
            </button>
          </fieldset>
        </div>
      )}

      <p className="builder-status" role="status">
        {message ??
          `${t('summary.vertexCount', { count: graph.vertices.length })} · ${t('summary.edgeCount', { count: graph.edges.length })}`}
      </p>

      <GraphCanvas
        draft={draft}
        step={step}
        startVertex={startVertex}
        editable={editable}
        selectedVertex={selected}
        onCanvasClick={handleCanvasClick}
        onVertexActivate={handleVertexActivate}
        onVertexMove={(id, point) => update({ graph, layout: { ...draft.layout, [id]: point } })}
        onVertexDelete={(id) => update(removeVertex(draft, id), t('builder.vertexRemoved', { label: labelOf(id) }))}
        onEdgeActivate={deleteEdge}
      />

      {editable && graph.vertices.length > 0 && (
        <details className="element-tables" open>
          <summary>{t('builder.tables')}</summary>
          <table>
            <caption>{t('builder.vertexTable')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('builder.vertex')}</th>
                <th scope="col">{t('builder.degree')}</th>
                <th scope="col">{t('builder.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {graph.vertices.map((vertex) => (
                <tr key={vertex.id}>
                  <th scope="row">{vertex.label}</th>
                  <td>{graph.edges.filter((e) => e.from === vertex.id || e.to === vertex.id).length}</td>
                  <td>
                    <button type="button" onClick={() => update(removeVertex(draft, vertex.id), t('builder.vertexRemoved', { label: vertex.label }))}>
                      {t('builder.remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {graph.edges.length > 0 && (
            <table>
              <caption>{t('builder.edgeTable')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('builder.edge')}</th>
                  {graph.weighted && <th scope="col">{t('builder.weight')}</th>}
                  <th scope="col">{t('builder.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {graph.edges.map((edge) => (
                  <tr key={edge.id}>
                    <th scope="row">
                      {labelOf(edge.from)} {graph.directed ? '→' : '–'} {labelOf(edge.to)}
                    </th>
                    {graph.weighted && (
                      <td>
                        <label className="visually-hidden" htmlFor={`${ids}-w-${edge.id}`}>
                          {t('builder.weightOf', { from: labelOf(edge.from), to: labelOf(edge.to) })}
                        </label>
                        <input
                          id={`${ids}-w-${edge.id}`}
                          type="number"
                          value={edge.weight}
                          onChange={(event) => update(setEdgeWeight(draft, edge.id, Number(event.target.value)))}
                        />
                      </td>
                    )}
                    <td className="row-actions">
                      {graph.directed && (
                        <button
                          type="button"
                          onClick={() => {
                            const result = reverseEdge(draft, edge.id);
                            if (result.problem) setMessage(t(`builder.problem.${result.problem}`));
                            else update(result.draft, t('builder.edgeReversed'));
                          }}
                        >
                          {t('builder.reverse')}
                        </button>
                      )}
                      <button type="button" onClick={() => deleteEdge(edge.id)}>
                        {t('builder.remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      )}
    </section>
  );
}
