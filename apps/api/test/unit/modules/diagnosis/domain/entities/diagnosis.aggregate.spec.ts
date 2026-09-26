import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function diagnosisIn(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: ID,
    userId: 'user-1',
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    frameworkVersionId: 1,
  });
}

describe('Diagnosis.recordDeepAnalysisResult', () => {
  it('stays in progress with only one of the two results', () => {
    const diagnosis = diagnosisIn('DEEP_ANALYSIS_IN_PROGRESS');

    diagnosis.recordDeepAnalysisResult('recommendation');

    expect(diagnosis.state.value).toBe('DEEP_ANALYSIS_IN_PROGRESS');
    expect(diagnosis.toPersistence().recommendationCalculatedAt).toBeInstanceOf(Date);
    expect(diagnosis.toPersistence().roadmapCalculatedAt).toBeNull();
  });

  it.each([
    ['recommendation', 'roadmap'],
    ['roadmap', 'recommendation'],
  ] as const)('completes the deep analysis once both arrived (%s first)', (first, second) => {
    const diagnosis = diagnosisIn('DEEP_ANALYSIS_IN_PROGRESS');

    diagnosis.recordDeepAnalysisResult(first);
    diagnosis.recordDeepAnalysisResult(second);

    expect(diagnosis.state.value).toBe('DEEP_ANALYSIS_COMPLETE');
    expect(diagnosis.deepAnalysisAccepted).toBe(true);
  });

  it('a retried calculation on a complete diagnostic only refreshes its date', () => {
    const at = new Date('2026-02-01T00:00:00.000Z');
    const diagnosis = Diagnosis.fromPersistence({
      id: ID,
      userId: 'user-1',
      state: 'DEEP_ANALYSIS_COMPLETE',
      createdAt: at,
      frameworkVersionId: 1,
      recommendationCalculatedAt: at,
      roadmapCalculatedAt: at,
    });
    const later = new Date('2026-03-01T00:00:00.000Z');

    diagnosis.recordDeepAnalysisResult('roadmap', later);

    expect(diagnosis.state.value).toBe('DEEP_ANALYSIS_COMPLETE');
    expect(diagnosis.toPersistence().roadmapCalculatedAt).toBe(later);
  });
});
