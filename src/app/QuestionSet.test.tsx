import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../domain/questions';
import { createI18n } from '../i18n';
import { QuestionSet } from './QuestionSet';

const [question] = QUESTIONS;

async function renderQuestions(lng = 'en') {
  const i18n = await createI18n(lng);
  render(
    <I18nextProvider i18n={i18n}>
      <QuestionSet />
    </I18nextProvider>,
  );
  return i18n;
}

function group(prompt: RegExp) {
  return within(screen.getByRole('group', { name: prompt }));
}

describe('review questions', () => {
  it('lists the three algorithms with their questions', async () => {
    await renderQuestions();
    for (const name of ['Floyd–Warshall', 'Prim', 'Kruskal']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('group')).toHaveLength(QUESTIONS.length);
    expect(screen.getByText('0 of 9 answered, 0 correct.')).toBeInTheDocument();
  });

  it('confirms an expected answer and shows the reasoning', async () => {
    const user = userEvent.setup();
    const i18n = await renderQuestions();
    const expected = i18n.t(`questions:items.${question!.id}.options.${question!.expected}`);

    await user.click(group(/What does Floyd–Warshall compute/).getByRole('radio', { name: expected }));

    expect(screen.getByText(/^Correct\./)).toBeInTheDocument();
    expect(screen.getByText(/table with one entry per ordered pair/)).toBeInTheDocument();
    expect(screen.getByText('1 of 9 answered, 1 correct.')).toBeInTheDocument();
  });

  it('marks the expected answer after a wrong choice and clears answers on request', async () => {
    const user = userEvent.setup();
    const i18n = await renderQuestions();
    const wrongOption = question!.options.find((o) => o !== question!.expected)!;
    const wrong = i18n.t(`questions:items.${question!.id}.options.${wrongOption}`);

    await user.click(group(/What does Floyd–Warshall compute/).getByRole('radio', { name: wrong }));

    expect(screen.getByText(/^Not quite\./)).toBeInTheDocument();
    expect(screen.getByText('1 of 9 answered, 0 correct.')).toBeInTheDocument();
    expect(group(/What does Floyd–Warshall compute/).getByText('Expected answer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear answers' }));

    expect(screen.queryByText(/^Not quite\./)).not.toBeInTheDocument();
    expect(screen.getByText('0 of 9 answered, 0 correct.')).toBeInTheDocument();
  });
});
