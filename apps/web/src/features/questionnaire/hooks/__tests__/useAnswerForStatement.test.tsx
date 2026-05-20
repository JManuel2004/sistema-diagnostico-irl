import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnswerForStatement } from '../useAnswerForStatement';
import { useQuestionnaireDraftStore } from '../../store/questionnaire-draft.store';

/**
 * Tests for the bridge hook between `StatementCard` and the Zustand
 * draft store (SPEC-STORY2 §5.3 / §6).
 */
describe('useAnswerForStatement', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
  });

  it('returns null when no answer exists yet', () => {
    const { result } = renderHook(() => useAnswerForStatement('s1'));
    expect(result.current.value).toBeNull();
  });

  it('writes through to the store when setAnswer is invoked', () => {
    const { result } = renderHook(() => useAnswerForStatement('s1'));

    act(() => {
      result.current.setAnswer(3);
    });

    expect(result.current.value).toBe(3);
    expect(useQuestionnaireDraftStore.getState().answers.s1).toBe(3);
  });

  it('subscriptions for different statementIds are independent', () => {
    const a = renderHook(() => useAnswerForStatement('s1'));
    const b = renderHook(() => useAnswerForStatement('s2'));

    act(() => {
      a.result.current.setAnswer(2);
    });

    expect(a.result.current.value).toBe(2);
    expect(b.result.current.value).toBeNull();

    act(() => {
      b.result.current.setAnswer(5);
    });

    expect(a.result.current.value).toBe(2);
    expect(b.result.current.value).toBe(5);
  });

  it('reflects later writes performed directly on the store', () => {
    const { result } = renderHook(() => useAnswerForStatement('s1'));

    act(() => {
      useQuestionnaireDraftStore.getState().setAnswer('s1', 4);
    });

    expect(result.current.value).toBe(4);
  });
});
