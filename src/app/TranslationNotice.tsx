import { useTranslation } from 'react-i18next';
import { FALLBACK_LOCALE, getLocale, hasMissingNamespaces, overallStatus } from '../i18n/locales';

/** Makes unreviewed or partially translated content explicit to the reader. */
export function TranslationNotice() {
  const { t, i18n } = useTranslation('common');
  const locale = getLocale(i18n.resolvedLanguage ?? i18n.language);
  if (!locale) return null;
  const draft = overallStatus(locale) !== 'reviewed';
  const partial = hasMissingNamespaces(locale);
  if (!draft && !partial) return null;
  return (
    <aside className="notice" role="note">
      {draft && <p>{t('translationStatus.draft')}</p>}
      {partial && <p>{t('translationStatus.fallback', { fallbackLanguage: getLocale(FALLBACK_LOCALE)?.nativeName })}</p>}
    </aside>
  );
}
