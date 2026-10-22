import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { createI18n } from '../i18n';
import { App } from './App';

async function renderApp(lng = 'en') {
  const i18n = await createI18n(lng);
  render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  );
  return i18n;
}

describe('App shell', () => {
  it('shows the intro, algorithm choice and the draft-translation notice', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { level: 1, name: 'Graph Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Breadth-First Search \(BFS\)/ })).toBeChecked();
    expect(screen.getByRole('note')).toHaveTextContent('not yet been reviewed');
  });

  it('lists languages by native name', async () => {
    await renderApp();
    const select = screen.getByRole('combobox', { name: 'Language' });
    const names = Array.from(select.querySelectorAll('option'), (o) => o.textContent);
    expect(names).toEqual(['English', 'Português (Portugal)', 'Português (Brasil)', 'Español', 'Deutsch']);
  });

  it('switches language without resetting UI state', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('radio', { name: /Depth-First Search/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'de');

    expect(await screen.findByRole('heading', { level: 1, name: 'Graph-Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Tiefensuche \(DFS\)/ })).toBeChecked();
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem('algo-lab.locale')).toBe('de');
  });
});
