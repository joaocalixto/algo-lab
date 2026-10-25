import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { GraphLab, SpeedIndex } from './useGraphLab';
import { SPEEDS } from './useGraphLab';
import { StepPanels } from './StepPanels';

/**
 * Playback over a precomputed trace: play/pause, one step forward or back,
 * restart, and a slider to jump anywhere. Nothing here can change the result —
 * it only moves the index, which is why stepping backwards is exact.
 *
 * The explanation of the current step is an `aria-live` region, so a screen
 * reader announces each step as it happens.
 */
export function AlgorithmRunner({ lab }: { readonly lab: GraphLab }) {
  const { t } = useTranslation('explorer');
  const ids = useId();

  if (lab.trace === null) {
    return (
      <section className="runner" aria-labelledby={`${ids}-title`}>
        <h2 id={`${ids}-title`}>{t('runner.title')}</h2>
        <p className="notice" role="note">
          {lab.unmet.length > 0
            ? lab.unmet.map((kind) => t(`prerequisite.unmet.${kind}`)).join(' ')
            : t('runner.needsStartVertex')}
        </p>
      </section>
    );
  }

  const { step, index, stepCount } = lab;

  return (
    <section className="runner" aria-labelledby={`${ids}-title`}>
      <div className="runner-head">
        <h2 id={`${ids}-title`}>{t(`algorithm.${lab.algorithmId}.name`)}</h2>
        {lab.definition.needsStartVertex && lab.startVertex && (
          <div className="field">
            <label htmlFor={`${ids}-start`}>{t('runner.startVertex')}</label>
            <select id={`${ids}-start`} value={lab.startVertex} onChange={(event) => lab.setStartVertex(event.target.value)}>
              {lab.draft.graph.vertices.map((vertex) => (
                <option key={vertex.id} value={vertex.id}>
                  {vertex.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="controls">
        <button type="button" onClick={lab.restart} disabled={lab.atStart && !lab.playing}>
          {t('runner.restart')}
        </button>
        <button type="button" onClick={lab.previous} disabled={lab.atStart}>
          {t('runner.previous')}
        </button>
        <button type="button" className="primary-button" onClick={lab.togglePlay} disabled={lab.atEnd}>
          {lab.playing ? t('runner.pause') : t('runner.play')}
        </button>
        <button type="button" onClick={lab.next} disabled={lab.atEnd}>
          {t('runner.next')}
        </button>
        <div className="field">
          <label htmlFor={`${ids}-speed`}>{t('runner.speed')}</label>
          <select
            id={`${ids}-speed`}
            value={lab.speed}
            onChange={(event) => lab.setSpeed(Number(event.target.value) as SpeedIndex)}
          >
            {SPEEDS.map((ms, i) => (
              <option key={ms} value={i}>
                {t(`runner.speeds.${i}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="scrubber">
        <label htmlFor={`${ids}-step`}>{t('runner.stepOf', { current: index + 1, total: stepCount })}</label>
        <input
          id={`${ids}-step`}
          type="range"
          min={0}
          max={Math.max(stepCount - 1, 0)}
          value={index}
          onChange={(event) => lab.goTo(Number(event.target.value))}
        />
      </div>

      <p className="step-explanation" aria-live="polite">
        {step ? t(step.explanation.key, step.explanation.values ?? {}) : ''}
      </p>

      {step && <StepPanels step={step} />}
    </section>
  );
}
