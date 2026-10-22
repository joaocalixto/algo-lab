import { describe, expect, it } from 'vitest';
import { LOCALES, SELECTABLE_LOCALES, getLocale, overallStatus } from '../locales';
import { resolveLocale } from '../resolveLocale';

const MANDATORY = ['pt-PT', 'pt-BR', 'en', 'es', 'de'];

describe('locale registry', () => {
  it('declares the mandatory locales as separate, selectable entries', () => {
    const mandatory = LOCALES.filter((l) => l.tier === 'mandatory').map((l) => l.code);
    expect(mandatory.sort()).toEqual([...MANDATORY].sort());
    for (const code of MANDATORY) expect(SELECTABLE_LOCALES.map((l) => l.code)).toContain(code);
  });

  it('has unique, canonical BCP 47 codes', () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(Intl.getCanonicalLocales(code)[0]).toBe(code);
  });

  it('marks Arabic as right-to-left and every other locale as left-to-right', () => {
    for (const l of LOCALES) expect(l.dir).toBe(l.code === 'ar' ? 'rtl' : 'ltr');
  });

  it('does not mark any locale reviewed without explicit sign-off', () => {
    // Update this expectation only when a human reviewer validates a locale.
    expect(LOCALES.filter((l) => overallStatus(l) === 'reviewed')).toEqual([]);
  });

  it('distinguishes Portuguese variants by native name', () => {
    expect(getLocale('pt-PT')?.nativeName).toBe('Português (Portugal)');
    expect(getLocale('pt-BR')?.nativeName).toBe('Português (Brasil)');
  });
});

describe('resolveLocale', () => {
  const supported = SELECTABLE_LOCALES;
  it.each([
    [['pt-BR'], 'pt-BR'],
    [['pt-PT'], 'pt-PT'],
    [['pt'], 'pt-BR'],
    [['pt-AO'], 'pt-PT'],
    [['de-AT'], 'de'],
    [['es-MX', 'en'], 'es'],
    [['EN-gb'], 'en'],
    [['ja', 'de'], 'de'],
    [['xx-invalid-!!'], 'en'],
    [[], 'en'],
  ])('%j → %s', (requested, expected) => {
    expect(resolveLocale(requested, supported)).toBe(expected);
  });

  it('maps Chinese by script when both scripts are supported', () => {
    const zh = LOCALES.filter((l) => l.code.startsWith('zh'));
    expect(resolveLocale(['zh-TW'], zh)).toBe('zh-Hant');
    expect(resolveLocale(['zh-HK'], zh)).toBe('zh-Hant');
    expect(resolveLocale(['zh-CN'], zh)).toBe('zh-Hans');
    expect(resolveLocale(['zh'], zh)).toBe('zh-Hans');
  });
});
