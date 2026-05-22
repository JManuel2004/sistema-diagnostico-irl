import { MaturityProfile } from '../../../../../../src/modules/maturity-profile/domain/entities/maturity-profile.aggregate.js';
import { DimensionResult } from '../../../../../../src/modules/maturity-profile/domain/value-objects/dimension-result.vo.js';
import { DimensionCode } from '../../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../../../src/shared-kernel/domain/value-objects/irl-level.vo.js';
import { Uuid } from '../../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function resultFor(code: (typeof CODES)[number], level = 5): DimensionResult {
  return DimensionResult.create({
    dimensionCode: DimensionCode.create(code),
    averageLikert: 3.0,
    irlLevel: IrlLevel.create(level),
  });
}

function buildSixResults(): DimensionResult[] {
  return CODES.map((c) => resultFor(c));
}

describe('MaturityProfile (aggregate root)', () => {
  const diagnosticId = Uuid.create('550e8400-e29b-41d4-a716-446655440000');
  const computedAt = new Date('2026-05-22T10:00:00Z');

  describe('factory create', () => {
    it('builds with exactly six unique dimensions', () => {
      const p = MaturityProfile.create({
        diagnosticId,
        computedAt,
        dimensionResults: buildSixResults(),
      });
      expect(p.dimensionResults()).toHaveLength(6);
      expect(p.computedAt).toEqual(computedAt);
      expect(p.diagnosticId.equals(diagnosticId)).toBe(true);
    });

    it('rejects fewer than 6 results', () => {
      const five = buildSixResults().slice(0, 5);
      expect(() =>
        MaturityProfile.create({
          diagnosticId,
          computedAt,
          dimensionResults: five,
        }),
      ).toThrow(InvariantViolationError);
    });

    it('rejects more than 6 results', () => {
      const seven = [...buildSixResults(), resultFor('TRL', 6)];
      expect(() =>
        MaturityProfile.create({
          diagnosticId,
          computedAt,
          dimensionResults: seven,
        }),
      ).toThrow(InvariantViolationError);
    });

    it('rejects duplicate dimensions', () => {
      const withDuplicate = [
        resultFor('TRL'),
        resultFor('TRL', 9),
        resultFor('BRL'),
        resultFor('IPRL'),
        resultFor('TmRL'),
        resultFor('FRL'),
      ];
      expect(() =>
        MaturityProfile.create({
          diagnosticId,
          computedAt,
          dimensionResults: withDuplicate,
        }),
      ).toThrow(InvariantViolationError);
    });

    it('rejects when a framework dimension is missing', () => {
      // 6 results but CRL appears twice and IPRL is missing — the
      // duplicate check trips first; this verifies neither path lets
      // a malformed set through.
      const missingIprl = [
        resultFor('TRL'),
        resultFor('CRL'),
        resultFor('CRL', 7),
        resultFor('BRL'),
        resultFor('TmRL'),
        resultFor('FRL'),
      ];
      expect(() =>
        MaturityProfile.create({
          diagnosticId,
          computedAt,
          dimensionResults: missingIprl,
        }),
      ).toThrow(InvariantViolationError);
    });
  });

  describe('canonical sort', () => {
    it('sorts the results in TRL, CRL, BRL, IPRL, TmRL, FRL order', () => {
      const scrambled = [
        resultFor('FRL', 9),
        resultFor('TRL', 1),
        resultFor('IPRL', 3),
        resultFor('TmRL', 4),
        resultFor('CRL', 2),
        resultFor('BRL', 5),
      ];
      const p = MaturityProfile.create({
        diagnosticId,
        computedAt,
        dimensionResults: scrambled,
      });
      expect(p.dimensionResults().map((r) => r.dimensionCode.value)).toEqual([
        'TRL',
        'CRL',
        'BRL',
        'IPRL',
        'TmRL',
        'FRL',
      ]);
    });
  });

  describe('resultFor lookup', () => {
    const p = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: buildSixResults(),
    });

    it.each(CODES)('returns the result for %s', (code) => {
      const r = p.resultFor(code);
      expect(r).toBeDefined();
      expect(r?.dimensionCode.value).toBe(code);
    });

    it('returns undefined for an unknown code', () => {
      expect(p.resultFor('XYZ')).toBeUndefined();
    });
  });

  describe('persistence round-trip', () => {
    it('toPersistence + fromPersistence preserve the aggregate', () => {
      const original = MaturityProfile.create({
        diagnosticId,
        computedAt,
        dimensionResults: buildSixResults(),
      });
      const snapshot = original.toPersistence();
      const restored = MaturityProfile.fromPersistence(snapshot);
      expect(restored.diagnosticId.value).toBe(original.diagnosticId.value);
      expect(restored.computedAt).toEqual(original.computedAt);
      expect(
        restored.dimensionResults().map((r) => r.dimensionCode.value),
      ).toEqual(original.dimensionResults().map((r) => r.dimensionCode.value));
    });
  });
});
