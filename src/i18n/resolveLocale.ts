import { FALLBACK_LOCALE, type LocaleDefinition } from './locales';

/**
 * Picks the best supported locale for a list of BCP 47 tags (e.g. navigator.languages).
 * Order of preference: exact match, then same language with matching script/region
 * rules, then same base language. Returns FALLBACK_LOCALE if nothing matches.
 */
export function resolveLocale(requested: readonly string[], supported: readonly LocaleDefinition[]): string {
  const codes = supported.map((l) => l.code);
  for (const tag of requested) {
    const match = matchOne(tag, codes);
    if (match) return match;
  }
  return codes.includes(FALLBACK_LOCALE) ? FALLBACK_LOCALE : (codes[0] ?? FALLBACK_LOCALE);
}

function matchOne(tag: string, codes: readonly string[]): string | undefined {
  let locale: Intl.Locale;
  try {
    locale = new Intl.Locale(tag);
  } catch {
    return undefined;
  }
  const exact = codes.find((c) => c.toLowerCase() === locale.toString().toLowerCase());
  if (exact) return exact;

  const max = locale.maximize();
  const lang = max.language;

  if (lang === 'pt') {
    // CLDR maps bare "pt" to Brazil; every other region follows the European norm.
    return pick(codes, max.region === 'BR' ? 'pt-BR' : 'pt-PT') ?? pick(codes, 'pt-BR');
  }
  if (lang === 'zh') {
    return pick(codes, max.script === 'Hant' ? 'zh-Hant' : 'zh-Hans');
  }
  return codes.find((c) => new Intl.Locale(c).language === lang);
}

function pick(codes: readonly string[], code: string): string | undefined {
  return codes.includes(code) ? code : undefined;
}
