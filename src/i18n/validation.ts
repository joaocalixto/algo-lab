import type { ResourceTree } from './resources';

/** Pure checks shared by the automated tests and the coverage report. */

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const PLACEHOLDER = /\{\{\s*([\w.]+)\s*(?:,[^}]*)?\}\}/g;

export interface LocaleIssues {
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly placeholderMismatch: readonly string[];
  /** Plural keys lacking a CLDR category required by the target language. */
  readonly missingPluralForms: readonly string[];
  readonly empty: readonly string[];
  /** Fraction (0–1) of source message keys present in the target. */
  readonly coverage: number;
}

export function flatten(tree: ResourceTree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
}

/** Groups plural variants (`x_one`, `x_other`) under their base key `x`. */
export function groupMessages(flat: Map<string, string>): Map<string, Map<string, string>> {
  const groups = new Map<string, Map<string, string>>();
  for (const [key, value] of flat) {
    const m = PLURAL_SUFFIX.exec(key);
    const base = m ? key.slice(0, m.index) : key;
    const form = m?.[1] ?? '';
    const group = groups.get(base) ?? new Map<string, string>();
    group.set(form, value);
    groups.set(base, group);
  }
  return groups;
}

export function placeholders(text: string): Set<string> {
  return new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[1] ?? ''));
}

function placeholderUnion(group: Map<string, string>): string {
  const all = new Set<string>();
  for (const v of group.values()) for (const p of placeholders(v)) all.add(p);
  return [...all].sort().join(',');
}

export function pluralCategories(locale: string): readonly string[] {
  return new Intl.PluralRules(locale).resolvedOptions().pluralCategories;
}

export function compareLocale(source: ResourceTree, target: ResourceTree, targetLocale: string): LocaleIssues {
  const src = groupMessages(flatten(source));
  const tgt = groupMessages(flatten(target));
  const missing: string[] = [];
  const placeholderMismatch: string[] = [];
  const missingPluralForms: string[] = [];
  const empty: string[] = [];
  const required = pluralCategories(targetLocale);

  for (const [base, srcGroup] of src) {
    const tgtGroup = tgt.get(base);
    if (!tgtGroup) {
      missing.push(base);
      continue;
    }
    if (placeholderUnion(srcGroup) !== placeholderUnion(tgtGroup)) placeholderMismatch.push(base);
    const isPlural = !srcGroup.has('');
    if (isPlural) {
      for (const cat of required) if (!tgtGroup.has(cat)) missingPluralForms.push(`${base}_${cat}`);
    }
    for (const [form, value] of tgtGroup) {
      if (value.trim() === '') empty.push(form ? `${base}_${form}` : base);
    }
  }
  const extra = [...tgt.keys()].filter((k) => !src.has(k));
  const coverage = src.size === 0 ? 1 : (src.size - missing.length) / src.size;
  return { missing, extra, placeholderMismatch, missingPluralForms, empty, coverage };
}
