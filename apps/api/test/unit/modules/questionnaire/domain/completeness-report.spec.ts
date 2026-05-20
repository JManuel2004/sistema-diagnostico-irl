import { CompletenessReport } from '../../../../../src/modules/questionnaire/domain/value-objects/completeness-report.vo.js';

describe('CompletenessReport', () => {
  describe('isComplete', () => {
    it('returns true when answered equals expected and no missing', () => {
      const report = CompletenessReport.of(48, 48, []);
      expect(report.isComplete).toBe(true);
    });

    it('returns false when there are missing statements', () => {
      const report = CompletenessReport.of(47, 48, [
        { dimensionCode: 'TRL', sequence: 8, statementId: '8' },
      ]);
      expect(report.isComplete).toBe(false);
    });

    it('returns false when answered < expected even with empty missing list', () => {
      const report = CompletenessReport.of(40, 48, []);
      expect(report.isComplete).toBe(false);
    });
  });

  describe('of', () => {
    it('exposes all constructor arguments', () => {
      const missing = [{ dimensionCode: 'CRL', sequence: 3, statementId: '11' }];
      const report = CompletenessReport.of(47, 48, missing);
      expect(report.answeredCount).toBe(47);
      expect(report.expectedCount).toBe(48);
      expect(report.missing).toHaveLength(1);
      expect(report.missing[0].dimensionCode).toBe('CRL');
      expect(report.missing[0].statementId).toBe('11');
    });
  });
});
