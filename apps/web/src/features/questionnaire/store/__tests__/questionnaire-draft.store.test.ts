import { beforeEach, describe, expect, it } from 'vitest';
import { useQuestionnaireDraftStore } from '../questionnaire-draft.store';

describe('questionnaire draft store', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
  });

  it('initializes per-diagnostic and resets answers when diagnosticId changes', () => {
    useQuestionnaireDraftStore.getState().initialize('diag-A');
    useQuestionnaireDraftStore.getState().setAnswer('s1', 3);
    expect(useQuestionnaireDraftStore.getState().answers.s1).toBe(3);

    // initialize a different diagnostic -> answers must be cleared
    useQuestionnaireDraftStore.getState().initialize('diag-B');
    expect(useQuestionnaireDraftStore.getState().answers.s1).toBeUndefined();
    expect(useQuestionnaireDraftStore.getState().diagnosticId).toBe('diag-B');
  });
});
