import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ALGORITHMS, ALGORITHM_FAMILIES, type PrerequisiteKind, isApplicable, unmetPrerequisites } from '../domain/algorithms';
import type { Graph } from '../domain/graph';
import type { AlgorithmId } from '../domain/trace';

export interface AlgorithmPickerProps {
  readonly graph: Graph;
  readonly selected: AlgorithmId;
  readonly onSelect: (id: AlgorithmId) => void;
  /** Applies the changes an unmet prerequisite needs, so the reader can try it. */
  readonly onFixGraph: (unmet: readonly PrerequisiteKind[]) => void;
}

/**
 * Lists every algorithm, grouped by what it computes. An algorithm the current
 * graph does not satisfy stays visible and disabled, with the reason spelled
 * out and a shortcut that adjusts the graph — hiding it would leave the reader
 * guessing why it disappeared.
 */
export function AlgorithmPicker({ graph, selected, onSelect, onFixGraph }: AlgorithmPickerProps) {
  const { t } = useTranslation('explorer');
  const name = useId();

  return (
    <section className="algorithm-groups" aria-labelledby={`${name}-title`}>
      <h2 id={`${name}-title`}>{t('algorithm.label')}</h2>
      {ALGORITHM_FAMILIES.map((family) => (
        <fieldset key={family} className="algorithm-picker">
          <legend>{t(`family.${family}`)}</legend>
          {ALGORITHMS.filter((definition) => definition.family === family).map((definition) => {
            const unmet = unmetPrerequisites(definition, graph);
            const applicable = isApplicable(definition, graph);
            const fixable = unmet.filter((kind) => kind !== 'nonEmpty');
            return (
              <div
                key={definition.id}
                className={`algorithm-option${applicable ? '' : ' is-unavailable'}`}
                role="group"
                aria-label={t(`algorithm.${definition.id}.name`)}
              >
                <label>
                  <input
                    type="radio"
                    name={name}
                    value={definition.id}
                    checked={selected === definition.id}
                    disabled={!applicable}
                    onChange={() => onSelect(definition.id)}
                  />
                  <strong>{t(`algorithm.${definition.id}.name`)}</strong>
                  <span>{t(`algorithm.${definition.id}.summary`)}</span>
                </label>
                <p className="requirements">
                  {t('algorithm.requires', {
                    list: definition.prerequisites
                      .filter((kind) => kind !== 'nonEmpty')
                      .map((kind) => t(`prerequisite.${kind}`))
                      .join(', '),
                  })}
                </p>
                {!applicable && (
                  <p className="unmet">
                    {unmet.map((kind) => t(`prerequisite.unmet.${kind}`)).join(' ')}
                    {fixable.length > 0 && (
                      <>
                        {' '}
                        <button type="button" onClick={() => onFixGraph(fixable)}>
                          {t('algorithm.fixGraph')}
                        </button>
                      </>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      ))}
    </section>
  );
}
