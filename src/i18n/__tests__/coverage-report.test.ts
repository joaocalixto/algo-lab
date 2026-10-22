import { expect, it } from 'vitest';
import { LOCALES, NAMESPACES, SOURCE_LOCALE, namespaceStatus } from '../locales';
import type { ResourceTree } from '../resources';
import { compareLocale } from '../validation';

const files = import.meta.glob<ResourceTree>('../locales/*/*.json', { eager: true, import: 'default' });

// Prints a coverage table on `npm run i18n:check`.
it('reports locale coverage', () => {
  const rows = LOCALES.map((locale) => {
    const row: Record<string, string> = { tier: locale.tier };
    for (const ns of NAMESPACES) {
      const src = files[`../locales/${SOURCE_LOCALE}/${ns}.json`]!;
      const tgt = files[`../locales/${locale.code}/${ns}.json`];
      const pct = tgt ? Math.round(compareLocale(src, tgt, locale.code).coverage * 100) : 0;
      row[ns] = `${pct}% ${namespaceStatus(locale, ns)}`;
    }
    return [locale.code, row] as const;
  });
  console.table(Object.fromEntries(rows));
  expect(rows).toHaveLength(LOCALES.length);
});
