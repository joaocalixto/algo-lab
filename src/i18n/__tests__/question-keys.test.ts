import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../../domain/questions';
import { SOURCE_LOCALE } from '../locales';
import type { ResourceTree } from '../resources';
import { flatten } from '../validation';

const files = import.meta.glob<ResourceTree>('../locales/*/questions.json', { eager: true, import: 'default' });
const source = flatten(files[`../locales/${SOURCE_LOCALE}/questions.json`]!);

describe('question messages', () => {
  it.each(QUESTIONS.map((q) => [q.id, q] as const))('%s has a prompt, an explanation and every option', (id, question) => {
    expect(source.get(`items.${id}.prompt`), `items.${id}.prompt`).toBeTruthy();
    expect(source.get(`items.${id}.explanation`), `items.${id}.explanation`).toBeTruthy();
    for (const option of question.options) {
      expect(source.get(`items.${id}.options.${option}`), `items.${id}.options.${option}`).toBeTruthy();
    }
  });

  it('has no messages for questions the bank no longer holds', () => {
    const known = new Set(QUESTIONS.map((q) => q.id));
    const orphans = [...source.keys()]
      .filter((key) => key.startsWith('items.'))
      .map((key) => key.split('.')[1]!)
      .filter((id) => !known.has(id));
    expect([...new Set(orphans)]).toEqual([]);
  });

  it('describes every topic of the bank', () => {
    for (const { topic } of QUESTIONS) {
      expect(source.get(`topics.${topic}.name`), topic).toBeTruthy();
      expect(source.get(`topics.${topic}.summary`), topic).toBeTruthy();
    }
  });
});
