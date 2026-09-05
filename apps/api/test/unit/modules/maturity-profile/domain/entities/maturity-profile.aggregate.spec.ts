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

  describe('bottleneck (RF-08)', () => {
    it('returns the single dimension with the lowest level', () => {
      const results = [
        resultFor('TRL', 5),
        resultFor('CRL', 3),
        resultFor('BRL', 7),
        resultFor('IPRL', 4),
        resultFor('TmRL', 6),
        resultFor('FRL', 8),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      const b = p.bottleneck();
      expect(b.level).toBe(3);
      expect(b.dimensions).toHaveLength(1);
      expect(b.dimensions[0]!.dimensionCode.value).toBe('CRL');
    });

    it('returns all tied dimensions when several share the minimum level', () => {
      const results = [
        resultFor('TRL', 8),
        resultFor('CRL', 2),
        resultFor('BRL', 5),
        resultFor('IPRL', 2),
        resultFor('TmRL', 2),
        resultFor('FRL', 7),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      const b = p.bottleneck();
      expect(b.level).toBe(2);
      expect(b.dimensions).toHaveLength(3);
      const codes = b.dimensions.map((r) => r.dimensionCode.value).sort();
      expect(codes).toEqual(['CRL', 'IPRL', 'TmRL']);
    });

    it('returns all six dimensions when every level is the same', () => {
      const p = MaturityProfile.create({
        diagnosticId,
        computedAt,
        dimensionResults: buildSixResults(),
      });
      const b = p.bottleneck();
      expect(b.level).toBe(5);
      expect(b.dimensions).toHaveLength(6);
    });

    it('returns level 1 when the minimum is the lowest possible IRL level', () => {
      const results = [
        resultFor('TRL', 1),
        resultFor('CRL', 9),
        resultFor('BRL', 9),
        resultFor('IPRL', 9),
        resultFor('TmRL', 9),
        resultFor('FRL', 9),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      const b = p.bottleneck();
      expect(b.level).toBe(1);
      expect(b.dimensions[0]!.dimensionCode.value).toBe('TRL');
    });
  });

  describe('strength', () => {
    it('returns the single dimension with the highest level', () => {
      const results = [
        resultFor('TRL', 8),
        resultFor('CRL', 3),
        resultFor('BRL', 5),
        resultFor('IPRL', 4),
        resultFor('TmRL', 6),
        resultFor('FRL', 2),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      const s = p.strength();
      expect(s.level).toBe(8);
      expect(s.dimensions.map((r) => r.dimensionCode.value)).toEqual(['TRL']);
    });

    it('returns all tied dimensions at the maximum', () => {
      const results = [
        resultFor('TRL', 7),
        resultFor('CRL', 7),
        resultFor('BRL', 4),
        resultFor('IPRL', 4),
        resultFor('TmRL', 4),
        resultFor('FRL', 4),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      expect(p.strength().dimensions.map((r) => r.dimensionCode.value)).toEqual(['TRL', 'CRL']);
    });
  });

  describe('asymmetry', () => {
    it('classifies a spread of 3 as MODERADO', () => {
      const results = [
        resultFor('TRL', 5),
        resultFor('CRL', 3),
        resultFor('BRL', 3),
        resultFor('IPRL', 2),
        resultFor('TmRL', 4),
        resultFor('FRL', 3),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      expect(p.asymmetry()).toEqual({ difference: 3, classification: 'MODERADO' });
    });

    it('classifies a uniform profile as ACEPTABLE', () => {
      const p = MaturityProfile.create({
        diagnosticId,
        computedAt,
        dimensionResults: CODES.map((c) => resultFor(c, 6)),
      });
      expect(p.asymmetry()).toEqual({ difference: 0, classification: 'ACEPTABLE' });
    });

    it('classifies a spread of 8 as CRITICO', () => {
      const results = [
        resultFor('TRL', 9),
        resultFor('CRL', 1),
        resultFor('BRL', 9),
        resultFor('IPRL', 1),
        resultFor('TmRL', 9),
        resultFor('FRL', 1),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      expect(p.asymmetry()).toEqual({ difference: 8, classification: 'CRITICO' });
    });
  });

  describe('gaps (critical IRL threshold)', () => {
    it('includes every dimension with IRL ≤ 3 and reports the threshold', () => {
      const results = [
        resultFor('TRL', 5),
        resultFor('CRL', 3),
        resultFor('BRL', 3),
        resultFor('IPRL', 2),
        resultFor('TmRL', 4),
        resultFor('FRL', 3),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      const g = p.gaps();
      expect(g.threshold).toBe(3);
      expect(g.dimensions.map((r) => r.dimensionCode.value)).toEqual([
        'CRL',
        'BRL',
        'IPRL',
        'FRL',
      ]);
    });

    it('returns no dimensions when every level is above the threshold', () => {
      const p = MaturityProfile.create({
        diagnosticId,
        computedAt,
        dimensionResults: CODES.map((c) => resultFor(c, 6)),
      });
      const g = p.gaps();
      expect(g.dimensions).toHaveLength(0);
      expect(g.threshold).toBe(3);
    });

    it('includes a dimension exactly at the threshold', () => {
      const results = [
        resultFor('TRL', 6),
        resultFor('CRL', 6),
        resultFor('BRL', 6),
        resultFor('IPRL', 3),
        resultFor('TmRL', 6),
        resultFor('FRL', 6),
      ];
      const p = MaturityProfile.create({ diagnosticId, computedAt, dimensionResults: results });
      expect(p.gaps().dimensions.map((r) => r.dimensionCode.value)).toEqual(['IPRL']);
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
