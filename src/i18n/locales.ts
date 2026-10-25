/**
 * Locale registry: the single place where languages are declared.
 * Adding a language = add an entry here + JSON files under ./locales/<code>/.
 * The algorithm engine never depends on this module.
 */

export const NAMESPACES = ['common', 'explorer', 'questions', 'glossary'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/**
 * - reviewed: validated by a qualified human reviewer.
 * - draft:    complete or partial, but NOT yet validated (includes machine/AI drafts).
 * - missing:  no resources; the fallback locale is shown.
 */
export type TranslationStatus = 'reviewed' | 'draft' | 'missing';

export type LocaleTier = 'mandatory' | 'additional';

export interface LocaleDefinition {
  readonly code: string;
  /** Name in the language itself, shown in the language selector. */
  readonly nativeName: string;
  readonly englishName: string;
  readonly dir: 'ltr' | 'rtl';
  readonly tier: LocaleTier;
  /** Per-namespace quality status; unspecified namespaces are `missing`. */
  readonly status: Readonly<Partial<Record<Namespace, TranslationStatus>>>;
}

export const SOURCE_LOCALE = 'en';
export const FALLBACK_LOCALE = 'en';

// Every mandatory locale is `draft` until a human reviewer signs it off.
const DRAFT_ALL: LocaleDefinition['status'] = { common: 'draft', explorer: 'draft', questions: 'draft', glossary: 'draft' };

export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', tier: 'mandatory', status: DRAFT_ALL },
  { code: 'pt-PT', nativeName: 'Português (Portugal)', englishName: 'Portuguese (Portugal)', dir: 'ltr', tier: 'mandatory', status: DRAFT_ALL },
  { code: 'pt-BR', nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', dir: 'ltr', tier: 'mandatory', status: DRAFT_ALL },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', tier: 'mandatory', status: DRAFT_ALL },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', tier: 'mandatory', status: DRAFT_ALL },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'zh-Hans', nativeName: '简体中文', englishName: 'Chinese (Simplified)', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'zh-Hant', nativeName: '繁體中文', englishName: 'Chinese (Traditional)', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', tier: 'additional', status: {} },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', tier: 'additional', status: {} },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian', dir: 'ltr', tier: 'additional', status: {} },
];

export function getLocale(code: string): LocaleDefinition | undefined {
  return LOCALES.find((l) => l.code === code);
}

export function namespaceStatus(locale: LocaleDefinition, ns: Namespace): TranslationStatus {
  return locale.status[ns] ?? 'missing';
}

/** Overall status: the weakest status across namespaces. */
export function overallStatus(locale: LocaleDefinition): TranslationStatus {
  const statuses = NAMESPACES.map((ns) => namespaceStatus(locale, ns));
  if (statuses.every((s) => s === 'reviewed')) return 'reviewed';
  if (statuses.every((s) => s === 'missing')) return 'missing';
  return 'draft';
}

/** A locale is offered in the UI once at least one namespace has resources. */
export function isSelectable(locale: LocaleDefinition): boolean {
  return overallStatus(locale) !== 'missing';
}

export function hasMissingNamespaces(locale: LocaleDefinition): boolean {
  return NAMESPACES.some((ns) => namespaceStatus(locale, ns) === 'missing');
}

export const SELECTABLE_LOCALES: readonly LocaleDefinition[] = LOCALES.filter(isSelectable);
