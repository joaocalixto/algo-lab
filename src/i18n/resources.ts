import type { Namespace } from './locales';

export type ResourceTree = { readonly [key: string]: string | ResourceTree };

// Lazy: each locale/namespace becomes its own chunk, loaded on demand.
const loaders = import.meta.glob<ResourceTree>('./locales/*/*.json', { import: 'default' });

export function loadNamespace(locale: string, ns: Namespace): Promise<ResourceTree | null> {
  const loader = loaders[`./locales/${locale}/${ns}.json`];
  return loader ? loader() : Promise.resolve(null);
}
