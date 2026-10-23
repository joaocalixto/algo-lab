import { Explorer } from './Explorer';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TraversalAlgorithm } from '../domain/traversal';
import { LanguageSelect } from './LanguageSelect';
import { TranslationNotice } from './TranslationNotice';

const ALGORITHMS: readonly TraversalAlgorithm[] = ['bfs', 'dfs'];

export function App() {
  const { t } = useTranslation(['common', 'explorer']);
  const [algorithm, setAlgorithm] = useState<TraversalAlgorithm>('bfs');

  return (
    <>
      <a className="skip-link" href="#main">
        {t('skipToContent')}
      </a>
      <header className="app-header">
        <div>
          <div className="brand-name">{t('app.name')}</div>
          <div className="brand-tagline">{t('app.tagline')}</div>
        </div>
        <LanguageSelect />
      </header>
      <main id="main" className="app-main" tabIndex={-1}>
        <TranslationNotice />
        <section className="intro" aria-labelledby="explorer-title">
          <h1 id="explorer-title">{t('explorer:title')}</h1>
          <p>{t('explorer:intro')}</p>
        </section>
        <fieldset className="algorithm-picker">
          <legend>{t('explorer:algorithm.label')}</legend>
          {ALGORITHMS.map((a) => (
            <label key={a} className="algorithm-option">
              <input type="radio" name="algorithm" value={a} checked={algorithm === a} onChange={() => setAlgorithm(a)} />
              <strong>
                {t(`explorer:algorithm.${a}.name`)} ({t(`explorer:algorithm.${a}.short`)})
              </strong>
              <span>{t(`explorer:algorithm.${a}.summary`)}</span>
            </label>
          ))}
        </fieldset>
        <Explorer key={algorithm} algorithm={algorithm} />
      </main>
      <footer className="app-footer">{t('footer.about')}</footer>
    </>
  );
}
