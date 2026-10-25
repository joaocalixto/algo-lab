import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

/** A missing translation renders as its own key, which this pattern catches. */
const RAW_KEY = /\b(builder|runner|panel|algorithm|prerequisite|family|canvas|vertexState|edgeMark|steps|notice|summary)\.[a-zA-Z]/;

describe('App shell', () => {
  it('shows the intro, the builder, every algorithm and the runner', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { level: 1, name: 'Graph Explorer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your graph' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Breadth-First Search \(BFS\)/ })).toBeChecked();
    for (const name of ['Dijkstra', 'Bellman–Ford', 'Floyd–Warshall', 'Kruskal', 'Prim', 'Kahn', 'Connected components']) {
      expect(screen.getByRole('radio', { name: new RegExp(name) }), name).toBeInTheDocument();
    }
    expect(screen.getByRole('note')).toHaveTextContent('not yet been reviewed');
    expect(screen.getByRole('region', { name: /Breadth-First Search/ })).toBeInTheDocument();
  });

  it('renders no raw translation keys in any mandatory locale', async () => {
    for (const code of ['en', 'pt-PT', 'pt-BR', 'es', 'de']) {
      const { unmount } = render(<div />);
      unmount();
      const i18n = await createI18n(code);
      const view = render(
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>,
      );
      expect(document.body.textContent ?? '', code).not.toMatch(RAW_KEY);
      view.unmount();
    }
  });

  it('lists languages by native name', async () => {
    await renderApp();
    const select = screen.getByRole('combobox', { name: 'Language' });
    const names = Array.from(select.querySelectorAll('option'), (o) => o.textContent);
    expect(names).toEqual(['English', 'Português (Portugal)', 'Português (Brasil)', 'Español', 'Deutsch']);
  });

  it('switches language without resetting the run', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: /Next step/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'de');

    expect(await screen.findByRole('heading', { level: 1, name: 'Graph-Explorer' })).toBeInTheDocument();
    expect(screen.getByText(/Schritt 2 von/)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem('algo-lab.locale')).toBe('de');
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('running an algorithm', () => {
  it('steps forward and back over a precomputed trace', async () => {
    const user = userEvent.setup();
    await renderApp();
    const runner = screen.getByRole('region', { name: /Breadth-First Search/ });
    expect(within(runner).getByText(/Step 1 of/)).toBeInTheDocument();
    await user.click(within(runner).getByRole('button', { name: 'Next step' }));
    expect(within(runner).getByText(/Step 2 of/)).toBeInTheDocument();
    await user.click(within(runner).getByRole('button', { name: 'Previous' }));
    expect(within(runner).getByText(/Step 1 of/)).toBeInTheDocument();
    expect(within(runner).getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('keeps playing until the end, then stops on its own', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderApp();
    const runner = screen.getByRole('region', { name: /Breadth-First Search/ });
    await user.click(within(runner).getByRole('button', { name: 'Play' }));
    // One chunk per step: React has to re-render before the next one is scheduled.
    const tick = async () => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
    };
    for (let i = 0; i < 4; i++) await tick();
    // Several steps, not one: each step has to schedule the next.
    expect(within(runner).getByText(/Step [5-9]\d* of/)).toBeInTheDocument();

    const total = Number(/of (\d+)/.exec(within(runner).getByText(/Step \d+ of/).textContent ?? '')?.[1]);
    for (let i = 0; i < total; i++) await tick();
    expect(within(runner).getByText(`Step ${total} of ${total}`)).toBeInTheDocument();
    expect(within(runner).getByRole('button', { name: 'Play' })).toBeDisabled();
  });

  it('explains why an algorithm does not fit the graph, and offers to adjust it', async () => {
    const user = userEvent.setup();
    await renderApp();
    const option = screen.getByRole('group', { name: 'Kahn (topological sort)' });
    expect(within(option).getByRole('radio', { name: /Kahn/ })).toBeDisabled();
    expect(within(option).getByText(/needs a directed graph/)).toBeInTheDocument();

    await user.click(within(option).getByRole('button', { name: 'Adjust the graph' }));
    expect(screen.getByRole('radio', { name: /Kahn/ })).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: /Kahn/ }));
    expect(screen.getByRole('region', { name: /Kahn/ })).toBeInTheDocument();
  });

  it('runs every algorithm the generated graph allows', async () => {
    const user = userEvent.setup();
    await renderApp();
    for (const name of [/Depth-First Search/, /Connected components/, /Dijkstra/, /Kruskal/, /Prim/]) {
      const option = screen.getByRole('radio', { name });
      expect(option, String(name)).toBeEnabled();
      await user.click(option);
      await user.click(screen.getByRole('button', { name: 'Next step' }));
      expect(screen.getByText(/Step 2 of/), String(name)).toBeInTheDocument();
    }
  });
});
