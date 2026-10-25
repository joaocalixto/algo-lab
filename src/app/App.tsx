import { useTranslation } from 'react-i18next';
import { fixForPrerequisites } from '../domain/editing';
import { AlgorithmPicker } from './AlgorithmPicker';
import { AlgorithmRunner } from './AlgorithmRunner';
import { GraphBuilder } from './GraphBuilder';
import { QuestionSet } from './QuestionSet';
import { LanguageSelect } from './LanguageSelect';
import { TranslationNotice } from './TranslationNotice';
import { useGraphLab } from './useGraphLab';

export function App() {
  const { t } = useTranslation(['common', 'explorer']);
  const lab = useGraphLab();

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

        <GraphBuilder
          draft={lab.draft}
          onChange={lab.updateDraft}
          step={lab.step}
          startVertex={lab.startVertex}
          onStartVertexChange={lab.setStartVertex}
          running={lab.playing}
        />

        <AlgorithmPicker
          graph={lab.draft.graph}
          selected={lab.algorithmId}
          onSelect={lab.setAlgorithm}
          onFixGraph={(unmet) => lab.updateDraft(fixForPrerequisites(lab.draft, unmet))}
        />

        <AlgorithmRunner lab={lab} />

        <QuestionSet />
      </main>
      <footer className="app-footer">{t('footer.about')}</footer>
    </>
  );
}
