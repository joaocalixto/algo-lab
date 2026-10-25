import { useTranslation } from 'react-i18next';
import type { AlgorithmStep, StepCell, StepHeader, StepTable } from '../domain/trace';

/**
 * Renders the side panels of a step: the tables, lists and notices the engine
 * produced. Numbers are formatted in the reader's locale here, in the UI, and
 * never inside the engine.
 */
export function StepPanels({ step }: { readonly step: AlgorithmStep }) {
  const { t, i18n } = useTranslation('explorer');
  const numbers = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language);

  const header = (value: StepHeader): string => (value.kind === 'text' ? value.text : t(value.key));
  const cell = (value: StepCell): string => {
    switch (value.kind) {
      case 'number':
        return numbers.format(value.value);
      case 'infinity':
        return '∞';
      case 'text':
        return value.text;
      case 'empty':
        return '—';
    }
  };

  const table = (data: StepTable, key: number) => (
    <table key={key} className="step-table">
      <caption>{t(data.titleKey)}</caption>
      <thead>
        <tr>
          <td />
          {data.columns.map((column, i) => (
            <th
              key={i}
              scope="col"
              className={data.activeColumn !== undefined && header(column) === data.activeColumn ? 'is-active' : undefined}
            >
              {header(column)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((row, i) => (
          <tr key={i} className={data.activeRow !== undefined && header(row.header) === data.activeRow ? 'is-active' : undefined}>
            <th scope="row">{header(row.header)}</th>
            {row.cells.map((value, j) => (
              <td key={j}>{cell(value)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="step-panels">
      {step.notices.map((notice, i) => (
        <p key={i} className="notice" role="alert">
          {t(notice.key, notice.values ?? {})}
        </p>
      ))}
      {step.lists.map((list, i) => (
        <section key={i} className="step-list">
          <h3>{t(list.titleKey, list.titleValues ?? {})}</h3>
          <p className="step-list-items">
            {list.items.length === 0 ? t('panel.empty') : list.items.join(list.ordered ? ' → ' : ', ')}
          </p>
          {list.hintKey && <small>{t(list.hintKey)}</small>}
        </section>
      ))}
      {step.tables.map(table)}
    </div>
  );
}
