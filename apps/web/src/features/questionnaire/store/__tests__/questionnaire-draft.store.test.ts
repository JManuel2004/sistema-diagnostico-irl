import { beforeEach, describe, expect, it } from 'vitest';
import { useQuestionnaireDraftStore } from '../questionnaire-draft.store';

describe('questionnaire draft store', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
    sessionStorage.clear();
  });

  describe('initial state', () => {
    it('starts empty with no diagnostic, TRL as default tab and dirty=false', () => {
      const s = useQuestionnaireDraftStore.getState();
      expect(s.answers).toEqual({});
      expect(s.diagnosticId).toBeNull();
      expect(s.activeTab).toBe('TRL');
      expect(s.dirty).toBe(false);
    });
  });

  describe('initialize', () => {
    it('attaches the diagnosticId and preserves answers when called with the same id', () => {
      useQuestionnaireDraftStore.getState().initialize('diag-A');
      useQuestionnaireDraftStore.getState().setAnswer('s1', 3);

      useQuestionnaireDraftStore.getState().initialize('diag-A');

      expect(useQuestionnaireDraftStore.getState().diagnosticId).toBe('diag-A');
      expect(useQuestionnaireDraftStore.getState().answers.s1).toBe(3);
    });

    it('wipes per-diagnostic state when called with a different diagnosticId (AC-5)', () => {
      useQuestionnaireDraftStore.getState().initialize('diag-A');
      useQuestionnaireDraftStore.getState().setAnswer('s1', 3);
      useQuestionnaireDraftStore.getState().setActiveTab('CRL');

      useQuestionnaireDraftStore.getState().initialize('diag-B');

      const s = useQuestionnaireDraftStore.getState();
      expect(s.diagnosticId).toBe('diag-B');
      expect(s.answers).toEqual({});
      expect(s.activeTab).toBe('TRL');
      expect(s.dirty).toBe(false);
    });

    it('treats null/undefined as a single nullable identity', () => {
      useQuestionnaireDraftStore.getState().initialize(undefined);
      const before = useQuestionnaireDraftStore.getState();
      expect(before.diagnosticId).toBeNull();

      useQuestionnaireDraftStore.getState().initialize(null);
      const after = useQuestionnaireDraftStore.getState();
      expect(after.diagnosticId).toBeNull();
    });
  });

  describe('setAnswer', () => {
    it('records a value and marks the store as dirty', () => {
      useQuestionnaireDraftStore.getState().setAnswer('s1', 4);
      const s = useQuestionnaireDraftStore.getState();
      expect(s.answers.s1).toBe(4);
      expect(s.dirty).toBe(true);
    });

    it('replaces an existing value (AC-3, AC-4)', () => {
      useQuestionnaireDraftStore.getState().setAnswer('s1', 4);
      useQuestionnaireDraftStore.getState().setAnswer('s1', 2);
      expect(useQuestionnaireDraftStore.getState().answers.s1).toBe(2);
    });
  });

  describe('setActiveTab', () => {
    it('updates the active dimension tab', () => {
      useQuestionnaireDraftStore.getState().setActiveTab('BRL');
      expect(useQuestionnaireDraftStore.getState().activeTab).toBe('BRL');
    });
  });

  describe('reset', () => {
    it('clears per-diagnostic state but keeps the diagnosticId', () => {
      useQuestionnaireDraftStore.getState().initialize('diag-A');
      useQuestionnaireDraftStore.getState().setAnswer('s1', 5);
      useQuestionnaireDraftStore.getState().setActiveTab('CRL');

      useQuestionnaireDraftStore.getState().reset();

      const s = useQuestionnaireDraftStore.getState();
      expect(s.diagnosticId).toBe('diag-A');
      expect(s.answers).toEqual({});
      expect(s.activeTab).toBe('TRL');
      expect(s.dirty).toBe(false);
    });
  });

  describe('clear', () => {
    it('wipes everything including the diagnosticId', () => {
      useQuestionnaireDraftStore.getState().initialize('diag-A');
      useQuestionnaireDraftStore.getState().setAnswer('s1', 5);

      useQuestionnaireDraftStore.getState().clear();

      const s = useQuestionnaireDraftStore.getState();
      expect(s.diagnosticId).toBeNull();
      expect(s.answers).toEqual({});
      expect(s.activeTab).toBe('TRL');
      expect(s.dirty).toBe(false);
    });
  });

  describe('persistence (AC-3, NF-1)', () => {
    it('writes answers, activeTab and diagnosticId to sessionStorage', () => {
      useQuestionnaireDraftStore.getState().initialize('diag-A');
      useQuestionnaireDraftStore.getState().setAnswer('s1', 5);
      useQuestionnaireDraftStore.getState().setActiveTab('BRL');

      const raw = sessionStorage.getItem('innlab.questionnaire-draft.v1');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as {
        state: { answers: Record<string, number>; diagnosticId: string; activeTab: string };
      };
      expect(parsed.state.answers.s1).toBe(5);
      expect(parsed.state.diagnosticId).toBe('diag-A');
      expect(parsed.state.activeTab).toBe('BRL');
    });

    it('does NOT persist the dirty flag (partialize)', () => {
      useQuestionnaireDraftStore.getState().setAnswer('s1', 5);

      const raw = sessionStorage.getItem('innlab.questionnaire-draft.v1');
      const parsed = JSON.parse(raw!) as { state: { dirty?: unknown } };
      expect(parsed.state.dirty).toBeUndefined();
    });
  });

  describe('what the server has (unsynced, syncedAt)', () => {
    it('every local change is unsynced and counts as a new revision', () => {
      const store = useQuestionnaireDraftStore.getState();
      store.initialize('diag-A');
      store.setAnswer('s1', 3);
      store.setJustification('s1', 'Porque sí');

      const s = useQuestionnaireDraftStore.getState();
      expect(s.unsynced).toBe(true);
      expect(s.revision).toBe(2);
    });

    it('a save marks the draft as synced only if nothing changed meanwhile', () => {
      const store = useQuestionnaireDraftStore.getState();
      store.initialize('diag-A');
      store.setAnswer('s1', 3);
      const sent = useQuestionnaireDraftStore.getState().revision;
      store.setAnswer('s2', 4);

      useQuestionnaireDraftStore.getState().markSynced('2026-10-16T12:00:00.000Z', sent);
      expect(useQuestionnaireDraftStore.getState().unsynced).toBe(true);

      const latest = useQuestionnaireDraftStore.getState().revision;
      useQuestionnaireDraftStore.getState().markSynced('2026-10-16T12:00:05.000Z', latest);
      expect(useQuestionnaireDraftStore.getState().unsynced).toBe(false);
      expect(useQuestionnaireDraftStore.getState().syncedAt).toBe('2026-10-16T12:00:05.000Z');
    });

    it('hydrate replaces the draft with the server one, as synced', () => {
      const store = useQuestionnaireDraftStore.getState();
      store.initialize('diag-A');
      store.hydrate({ s1: 2 }, { s1: 'Desde otro equipo' }, '2026-10-16T12:00:00.000Z');

      const s = useQuestionnaireDraftStore.getState();
      expect(s.answers).toEqual({ s1: 2 });
      expect(s.justifications).toEqual({ s1: 'Desde otro equipo' });
      expect(s.unsynced).toBe(false);
      expect(s.syncedAt).toBe('2026-10-16T12:00:00.000Z');
    });

    it('persists unsynced and syncedAt, so a reload still saves what the server lacks', () => {
      const store = useQuestionnaireDraftStore.getState();
      store.initialize('diag-A');
      store.setAnswer('s1', 5);

      const raw = sessionStorage.getItem('innlab.questionnaire-draft.v1');
      const parsed = JSON.parse(raw!) as { state: { unsynced: boolean; syncedAt: string | null } };
      expect(parsed.state.unsynced).toBe(true);
      expect(parsed.state.syncedAt).toBeNull();
    });
  });
});
