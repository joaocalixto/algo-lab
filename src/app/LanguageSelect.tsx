import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLocale } from '../i18n';
import { SELECTABLE_LOCALES } from '../i18n/locales';

export function LanguageSelect() {
  const { t, i18n } = useTranslation('common');
  const id = useId();
  return (
    <div className="language-select">
      <label htmlFor={id}>{t('language.label')}</label>
      <select id={id} value={i18n.resolvedLanguage ?? i18n.language} onChange={(e) => void changeLocale(i18n, e.target.value)}>
        {SELECTABLE_LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
