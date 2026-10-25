import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QUESTION_TOPICS, isCorrect, questionsOf, score } from '../domain/questions';
import type { AnswerSheet, OptionId } from '../domain/questions';

/** Self-check questions. Feedback is text plus a glyph, never color alone. */
export function QuestionSet() {
  const { t } = useTranslation('questions');
  const [answers, setAnswers] = useState<AnswerSheet>({});
  const { answered, correct, total } = score(answers);
  const choose = (id: string, option: OptionId) => setAnswers((prev) => ({ ...prev, [id]: option }));

  return (
    <section className="questions" aria-labelledby="questions-title">
      <h2 id="questions-title">{t('title')}</h2>
      <p className="hint">{t('intro')}</p>
      <div className="questions-progress">
        <p aria-live="polite">{t('progress', { answered, correct, total })}</p>
        <button onClick={() => setAnswers({})} disabled={answered === 0}>
          {t('reset')}
        </button>
      </div>
      {QUESTION_TOPICS.map((topic) => (
        <article key={topic} className="question-topic">
          <h3>{t(`topics.${topic}.name`)}</h3>
          <p className="hint">{t(`topics.${topic}.summary`)}</p>
          <ol className="question-list">
            {questionsOf(topic).map((question) => {
              const answer = answers[question.id];
              const right = isCorrect(question, answer);
              return (
                <li key={question.id}>
                  <fieldset className="question">
                    <legend>{t(`items.${question.id}.prompt`)}</legend>
                    {question.options.map((option) => (
                      <label key={option} className="question-option">
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answer === option}
                          onChange={() => choose(question.id, option)}
                        />
                        <span>{t(`items.${question.id}.options.${option}`)}</span>
                        {answer !== undefined && option === question.expected && (
                          <span className="question-expected">{t('feedback.expected')}</span>
                        )}
                      </label>
                    ))}
                  </fieldset>
                  <p
                    className={`question-feedback${answer === undefined ? '' : right ? ' is-correct' : ' is-incorrect'}`}
                    aria-live="polite"
                  >
                    {answer !== undefined && (
                      <>
                        <span aria-hidden="true">{right ? '✓' : '✗'} </span>
                        <strong>{t(right ? 'feedback.correct' : 'feedback.incorrect')}</strong>{' '}
                        {t(`items.${question.id}.explanation`)}
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </article>
      ))}
    </section>
  );
}
