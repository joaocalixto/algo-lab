import { describe, expect, it } from 'vitest';
import { QUESTIONS, QUESTION_TOPICS, isCorrect, questionsOf, score } from './questions';

describe('question bank', () => {
  it('has unique ids', () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('offers at least three distinct options per question, one of them expected', () => {
    for (const question of QUESTIONS) {
      expect(new Set(question.options).size, question.id).toBe(question.options.length);
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(3);
      expect(question.options, question.id).toContain(question.expected);
    }
  });

  it('covers every topic', () => {
    for (const topic of QUESTION_TOPICS) expect(questionsOf(topic).length, topic).toBeGreaterThan(0);
    expect(QUESTION_TOPICS.flatMap((t) => [...questionsOf(t)])).toHaveLength(QUESTIONS.length);
  });
});

describe('scoring', () => {
  const [first, second] = QUESTIONS;

  it('counts nothing before the first answer', () => {
    expect(score({})).toEqual({ answered: 0, correct: 0, total: QUESTIONS.length });
  });

  it('separates answered from correct', () => {
    const wrong = second!.options.find((o) => o !== second!.expected)!;
    const sheet = { [first!.id]: first!.expected, [second!.id]: wrong };
    expect(score(sheet)).toEqual({ answered: 2, correct: 1, total: QUESTIONS.length });
  });

  it('scores a subset of questions', () => {
    expect(score({ [first!.id]: first!.expected }, [first!])).toEqual({ answered: 1, correct: 1, total: 1 });
  });

  it('treats a missing answer as unanswered', () => {
    expect(isCorrect(first!, undefined)).toBe(false);
  });
});
