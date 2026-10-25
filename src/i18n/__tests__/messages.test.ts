import { describe, expect, it } from 'vitest';
import { ALGORITHMS, isApplicable } from '../../domain/algorithms';
import type { Graph } from '../../domain/graph';
import { buildGraph } from '../../test/graphs';
import type { AlgorithmTrace } from '../../domain/trace';
import { LOCALES } from '../locales';
import { createI18n } from '..';

/**
 * The engines name their messages by key; the resources hold the sentences.
 * These tests tie the two together: every key an engine can produce must exist
 * in every locale, and must leave no `{{placeholder}}` unfilled — which is how
 * a renamed interpolation value gets caught.
 */

const GRAPHS: readonly Graph[] = [
  buildGraph({ weighted: true, vertices: 'ABCDE', edges: [['A', 'B', 1], ['A', 'C', 6], ['B', 'C', 2], ['B', 'D', 3], ['C', 'E', 4]] }),
  buildGraph({ directed: true, weighted: true, vertices: 'ABCD', edges: [['A', 'B', 4], ['A', 'C', 2], ['C', 'B', 1], ['B', 'D', 5]] }),
  // Reachable negative cycle: exercises the Bellman–Ford and Floyd–Warshall notices.
  buildGraph({ directed: true, weighted: true, vertices: 'ABCD', edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'B', -3], ['C', 'D', 2]] }),
  // Disconnected: exercises "unreached", the spanning forest and Prim's partial tree.
  buildGraph({ weighted: true, vertices: 'ABCDE', edges: [['A', 'B', 2], ['C', 'D', 3]] }),
  // Directed with a cycle: exercises Kahn's cycle detection.
  buildGraph({ directed: true, weighted: true, vertices: 'ABC', edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'A', 1]] }),
  buildGraph({ weighted: true, vertices: 'A' }),
];

function traces(): readonly AlgorithmTrace[] {
  const all: AlgorithmTrace[] = [];
  for (const graph of GRAPHS) {
    for (const definition of ALGORITHMS) {
      if (!isApplicable(definition, graph)) continue;
      all.push(definition.run(graph, definition.needsStartVertex ? graph.vertices[0]!.id : null));
    }
  }
  return all;
}

interface Message {
  readonly key: string;
  readonly values: Readonly<Record<string, string | number>>;
}

function messagesOf(trace: AlgorithmTrace): readonly Message[] {
  const out: Message[] = [];
  for (const step of trace.steps) {
    out.push({ key: step.explanation.key, values: step.explanation.values ?? {} });
    for (const notice of step.notices) out.push({ key: notice.key, values: notice.values ?? {} });
    for (const table of step.tables) {
      out.push({ key: table.titleKey, values: {} });
      for (const column of table.columns) if (column.kind === 'key') out.push({ key: column.key, values: {} });
      for (const row of table.rows) if (row.header.kind === 'key') out.push({ key: row.header.key, values: {} });
    }
    for (const list of step.lists) {
      out.push({ key: list.titleKey, values: list.titleValues ?? {} });
      if (list.hintKey) out.push({ key: list.hintKey, values: {} });
    }
  }
  return out;
}

const ALL_MESSAGES = traces().flatMap(messagesOf);
const UNIQUE_KEYS = [...new Set(ALL_MESSAGES.map((m) => m.key))].sort();

describe('engine messages', () => {
  it('produces messages from every engine', () => {
    for (const prefix of ['traversal', 'components', 'dijkstra', 'bellman', 'floyd', 'kruskal', 'prim', 'kahn']) {
      expect(UNIQUE_KEYS.some((key) => key.startsWith(`explorer:steps.${prefix}.`)), prefix).toBe(true);
    }
    expect(UNIQUE_KEYS.filter((key) => key.startsWith('explorer:notice.'))).not.toEqual([]);
  });

  it.each(LOCALES.filter((l) => l.tier === 'mandatory').map((l) => l.code))('%s has every key, fully interpolated', async (code) => {
    const i18n = await createI18n(code);
    // Values are passed so that a plural key resolves to its CLDR form.
    const missing = ALL_MESSAGES.filter((message) => !i18n.exists(message.key, message.values)).map((m) => m.key);
    expect([...new Set(missing)]).toEqual([]);
    const unfilled = ALL_MESSAGES.filter((message) => {
      const text = i18n.t(message.key, message.values);
      return typeof text !== 'string' || text.includes('{{');
    }).map((message) => message.key);
    expect([...new Set(unfilled)]).toEqual([]);
  });
});
