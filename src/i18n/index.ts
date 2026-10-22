import i18next, { type BackendModule, type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { FALLBACK_LOCALE, NAMESPACES, SELECTABLE_LOCALES, getLocale } from './locales';
import { loadNamespace } from './resources';
import { resolveLocale } from './resolveLocale';
import { readStoredLocale, storeLocale } from './storage';

const lazyBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    loadNamespace(language, namespace as (typeof NAMESPACES)[number]).then(
      (data) => callback(null, data ?? {}),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), false),
    );
  },
};

export function initialLocale(): string {
  const stored = readStoredLocale();
  if (stored && SELECTABLE_LOCALES.some((l) => l.code === stored)) return stored;
  const requested = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return resolveLocale(requested, SELECTABLE_LOCALES);
}

function applyDocumentLocale(code: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = code;
  document.documentElement.dir = getLocale(code)?.dir ?? 'ltr';
}

/** Creates an isolated i18next instance (one per app; tests create their own). */
export async function createI18n(lng: string = initialLocale()): Promise<I18nInstance> {
  const instance = i18next.createInstance();
  instance.on('languageChanged', applyDocumentLocale);
  await instance
    .use(lazyBackend)
    .use(initReactI18next)
    .init({
      lng,
      fallbackLng: FALLBACK_LOCALE,
      supportedLngs: SELECTABLE_LOCALES.map((l) => l.code),
      load: 'currentOnly',
      ns: [...NAMESPACES],
      defaultNS: 'common',
      interpolation: { escapeValue: false }, // React already escapes output.
      returnNull: false,
      react: { useSuspense: false },
    });
  return instance;
}

/**
 * Loads resources first, then switches, so components re-render once with the
 * new strings and never unmount: execution/UI state is preserved.
 */
export async function changeLocale(instance: I18nInstance, code: string): Promise<void> {
  await instance.loadLanguages(code);
  await instance.changeLanguage(code);
  storeLocale(code);
}
