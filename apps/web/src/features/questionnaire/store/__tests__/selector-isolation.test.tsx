import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { selectAnswerById, useQuestionnaireDraftStore } from '../questionnaire-draft.store';

/**
 * NF-4 (SPEC-STORY3 / SPEC-STORY2): updating one answer must NOT
 * re-render unrelated subscribers. Without this, every Likert click
 * would re-render the 48 `StatementCard`s.
 */
function StatementSubscriber({
  statementId,
  onRender,
}: {
  statementId: string;
  onRender: () => void;
}) {
  const value = useQuestionnaireDraftStore(selectAnswerById(statementId));
  onRender();
  return <div data-testid={`stmt-${statementId}`}>{value ?? '-'}</div>;
}

describe('selector isolation (NF-4)', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
  });

  it('updating one answer does not re-render unrelated subscribers', () => {
    const renderA = vi.fn();
    const renderB = vi.fn();

    render(
      <>
        <StatementSubscriber statementId="stmt-A" onRender={renderA} />
        <StatementSubscriber statementId="stmt-B" onRender={renderB} />
      </>,
    );

    const callsBefore = {
      a: renderA.mock.calls.length,
      b: renderB.mock.calls.length,
    };

    act(() => {
      useQuestionnaireDraftStore.getState().setAnswer('stmt-A', 3);
    });

    // A re-rendered because its slice changed; B did NOT.
    expect(renderA.mock.calls.length).toBeGreaterThan(callsBefore.a);
    expect(renderB.mock.calls.length).toBe(callsBefore.b);
  });
});
