/**
 * Review questions about graph algorithms the explorer does not animate yet:
 * Floyd-Warshall, Prim and Kruskal.
 *
 * Pure data. A question stores message keys and the expected option, never
 * rendered text, so switching language never touches an answer the learner
 * already gave. Message keys live in the `questions` namespace:
 * `items.<id>.prompt`, `items.<id>.options.<option>`, `items.<id>.explanation`.
 */

export const QUESTION_TOPICS = ['floydWarshall', 'prim', 'kruskal'] as const;
export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

export const OPTION_IDS = ['a', 'b', 'c', 'd'] as const;
export type OptionId = (typeof OPTION_IDS)[number];

export interface Question {
  readonly id: string;
  readonly topic: QuestionTopic;
  readonly options: readonly OptionId[];
  /** The expected option. Exactly one option per question is expected. */
  readonly expected: OptionId;
}

export const QUESTIONS: readonly Question[] = [
  { id: 'fw-output', topic: 'floydWarshall', options: OPTION_IDS, expected: 'b' },
  { id: 'fw-loop-order', topic: 'floydWarshall', options: OPTION_IDS, expected: 'a' },
  { id: 'fw-diagonal', topic: 'floydWarshall', options: OPTION_IDS, expected: 'c' },
  { id: 'prim-output', topic: 'prim', options: OPTION_IDS, expected: 'a' },
  { id: 'prim-next-edge', topic: 'prim', options: OPTION_IDS, expected: 'b' },
  { id: 'prim-start', topic: 'prim', options: OPTION_IDS, expected: 'd' },
  { id: 'kruskal-order', topic: 'kruskal', options: OPTION_IDS, expected: 'b' },
  { id: 'kruskal-cycle-check', topic: 'kruskal', options: OPTION_IDS, expected: 'c' },
  { id: 'kruskal-disconnected', topic: 'kruskal', options: OPTION_IDS, expected: 'd' },
];

export type AnswerSheet = Readonly<Record<string, OptionId | undefined>>;

export interface Score {
  readonly answered: number;
  readonly correct: number;
  readonly total: number;
}

export function questionsOf(topic: QuestionTopic): readonly Question[] {
  return QUESTIONS.filter((q) => q.topic === topic);
}

export function isCorrect(question: Question, answer: OptionId | undefined): boolean {
  return answer === question.expected;
}

export function score(answers: AnswerSheet, questions: readonly Question[] = QUESTIONS): Score {
  let answered = 0;
  let correct = 0;
  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined) continue;
    answered += 1;
    if (isCorrect(question, answer)) correct += 1;
  }
  return { answered, correct, total: questions.length };
}
