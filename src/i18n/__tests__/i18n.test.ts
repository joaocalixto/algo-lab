import { describe, expect, it } from 'vitest';
import { changeLocale, createI18n, initialLocale } from '..';

describe('i18n runtime', () => {
  it('loads namespaces lazily and interpolates CLDR plurals', async () => {
    const i18n = await createI18n('es');
    expect(i18n.t('explorer:algorithm.bfs.name')).toBe('Búsqueda en anchura');
    expect(i18n.t('explorer:summary.vertexCount', { count: 1 })).toBe('1 vértice');
    expect(i18n.t('explorer:summary.vertexCount', { count: 7 })).toBe('7 vértices');
    expect(i18n.t('explorer:summary.vertexCount', { count: 1_000_000 })).toBe('1000000 de vértices');
  });

  it('updates document lang/dir and persists the choice', async () => {
    const i18n = await createI18n('en');
    await changeLocale(i18n, 'pt-PT');
    expect(document.documentElement.lang).toBe('pt-PT');
    expect(document.documentElement.dir).toBe('ltr');
    expect(i18n.t('explorer:algorithm.bfs.name')).toBe('Pesquisa em Largura');
    expect(initialLocale()).toBe('pt-PT');
  });

  it('ignores an unknown stored preference', () => {
    localStorage.setItem('algo-lab.locale', 'tlh');
    expect(['en', 'pt-PT', 'pt-BR', 'es', 'de']).toContain(initialLocale());
  });
});
