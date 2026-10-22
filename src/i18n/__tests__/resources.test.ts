import { describe, expect, it } from 'vitest';
import { LOCALES, NAMESPACES, SOURCE_LOCALE, namespaceStatus, type Namespace } from '../locales';
import type { ResourceTree } from '../resources';
import { compareLocale, flatten, placeholders } from '../validation';

const files = import.meta.glob<ResourceTree>('../locales/*/*.json', { eager: true, import: 'default' });

function resource(locale: string, ns: Namespace): ResourceTree | undefined {
  return files[`../locales/${locale}/${ns}.json`];
}

const nonSource = LOCALES.filter((l) => l.code !== SOURCE_LOCALE);

describe('translation resources', () => {
  it('only contains folders for registered locales and namespaces', () => {
    for (const path of Object.keys(files)) {
      const [, , locale, file] = path.split('/');
      expect(LOCALES.map((l) => l.code)).toContain(locale);
      expect(NAMESPACES.map((ns) => `${ns}.json`)).toContain(file);
    }
  });

  it('source locale has every namespace with non-empty strings', () => {
    for (const ns of NAMESPACES) {
      const src = resource(SOURCE_LOCALE, ns);
      expect(src, `${SOURCE_LOCALE}/${ns}`).toBeDefined();
      for (const [key, value] of flatten(src!)) expect(value.trim(), key).not.toBe('');
    }
  });

  it('declared status matches resource presence', () => {
    for (const locale of LOCALES) {
      for (const ns of NAMESPACES) {
        const present = resource(locale.code, ns) !== undefined;
        expect(present, `${locale.code}/${ns} status=${namespaceStatus(locale, ns)}`).toBe(
          namespaceStatus(locale, ns) !== 'missing',
        );
      }
    }
  });

  describe.each(nonSource.map((l) => [l.code, l] as const))('%s', (code, locale) => {
    const present = NAMESPACES.filter((ns) => resource(code, ns));
    if (present.length === 0) return it.skip('no resources yet');

    it.each(present)('%s: no extra keys, placeholder mismatches, empty strings or missing plural forms', (ns) => {
      const issues = compareLocale(resource(SOURCE_LOCALE, ns)!, resource(code, ns)!, code);
      expect(issues.extra).toEqual([]);
      expect(issues.placeholderMismatch).toEqual([]);
      expect(issues.empty).toEqual([]);
      expect(issues.missingPluralForms).toEqual([]);
    });

    if (locale.tier === 'mandatory') {
      it.each([...NAMESPACES])('%s: complete coverage (mandatory locale)', (ns) => {
        const target = resource(code, ns);
        expect(target, `${code}/${ns} missing`).toBeDefined();
        expect(compareLocale(resource(SOURCE_LOCALE, ns)!, target!, code).missing).toEqual([]);
      });
    }
  });
});

describe('validation helpers', () => {
  it('extracts placeholders, ignoring formatting arguments', () => {
    expect([...placeholders('Step {{current}} of {{ total, number }}')]).toEqual(['current', 'total']);
  });

  it('detects missing keys, extra keys, placeholder mismatches and plural forms', () => {
    const source = { a: 'Hello {{name}}', b: 'x', n_one: '{{count}} item', n_other: '{{count}} items' };
    const target = { a: 'Olá {{nome}}', c: 'y', n_one: '{{count}} item', n_other: '{{count}} itens' };
    const issues = compareLocale(source, target, 'pt-BR');
    expect(issues.missing).toEqual(['b']);
    expect(issues.extra).toEqual(['c']);
    expect(issues.placeholderMismatch).toEqual(['a']);
    expect(issues.missingPluralForms).toEqual(['n_many']);
    expect(issues.coverage).toBeCloseTo(2 / 3);
  });
});
