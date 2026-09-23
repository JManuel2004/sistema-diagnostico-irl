import { describe, expect, it } from '@jest/globals';
import type { DimensionCode, DiagnosticFacts } from '@innlab/contracts';
import {
  EligibilityFilterService,
  type CompiledEligibilityRule,
} from '../../../../../src/modules/routing/domain/services/eligibility-filter.service.js';
import type { NumericProfile } from '../../../../../src/modules/routing/domain/value-objects/ordinal-profile.vo.js';
import { PredicateCompilerService } from '../../../../../src/modules/routing/domain/services/predicate-compiler.service.js';

const compiler = new PredicateCompilerService();
const filtro = new EligibilityFilterService();

const FACTS: DiagnosticFacts = {
  diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  levelByDimension: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
  bottlenecks: ['IPRL'],
  gaps: ['BRL', 'IPRL', 'FRL'],
  imbalances: [],
  averageLevel: 3.5,
  characterization: {
    stage: 'validacion',
    sector: null,
    teamSize: 1,
    academicLinkage: false,
  },
} as unknown as DiagnosticFacts;

function profile(id: number, name: string): NumericProfile {
  return {
    idService: id,
    serviceName: name,
    minLevel: 1,
    maxLevel: 9,
    relevantStages: ['validacion'],
    intensities: new Map<DimensionCode, number>(),
    labels: new Map<DimensionCode, string>(),
  };
}

const ORDINAL_PROFILES = [profile(1, 'Formación'), profile(2, 'Retos'), profile(3, 'Grado')];

function rule(
  idService: number,
  predicate: unknown,
  message: string,
  ruleId = 'R',
): CompiledEligibilityRule {
  return {
    ruleId,
    idService,
    expression: compiler.compile(predicate, 'BOOLEAN'),
    exclusionMessage: message,
  };
}

describe('EligibilityFilterService', () => {
  it('un service sin rules asociadas es elegible por defecto', () => {
    const { eligible, excluded } = filtro.filter(ORDINAL_PROFILES, [], FACTS);
    expect(eligible).toHaveLength(3);
    expect(excluded).toHaveLength(0);
  });

  it('excluye el service cuya rule se cumple y reporta su mensaje', () => {
    const rules = [
      rule(
        2,
        { field: 'characterization.teamSize', op: '=', value: 1 },
        'Retos requiere al menos 2 personas',
      ),
    ];
    const { eligible, excluded } = filtro.filter(ORDINAL_PROFILES, rules, FACTS);

    expect(eligible.map((f) => f.serviceName)).toEqual([
      'Formación',
      'Grado',
    ]);
    expect(excluded).toEqual([
      {
        idService: 2,
        name: 'Retos',
        exclusionMessage: 'Retos requiere al menos 2 personas',
      },
    ]);
  });

  it('no excluye cuando la condición no se cumple', () => {
    const rules = [
      rule(
        2,
        { field: 'characterization.teamSize', op: '=', value: 9 },
        'no aplica',
      ),
    ];
    const { excluded } = filtro.filter(ORDINAL_PROFILES, rules, FACTS);
    expect(excluded).toHaveLength(0);
  });

  it('con varias rules sobre un service, reporta la primera que se cumple', () => {
    // The reason shown must be the one of the rule that actually left it
    // out, not a generic message.
    const rules = [
      rule(3, { field: 'gaps', op: 'contains', value: 'TRL' }, 'primera', 'R1'),
      rule(3, { field: 'gaps', op: 'contains', value: 'IPRL' }, 'segunda', 'R2'),
    ];
    const { excluded } = filtro.filter(ORDINAL_PROFILES, rules, FACTS);
    expect(excluded[0].exclusionMessage).toBe('segunda');
  });

  it('una rule solo afecta al service al que está asociada', () => {
    const rules = [
      rule(
        3,
        { field: 'characterization.academicLinkage', op: '=', value: false },
        'requiere vinculación',
      ),
    ];
    const { eligible, excluded } = filtro.filter(ORDINAL_PROFILES, rules, FACTS);
    expect(excluded.map((e) => e.name)).toEqual(['Grado']);
    expect(eligible.map((f) => f.serviceName)).toEqual([
      'Formación',
      'Retos',
    ]);
  });

  it('puede excluir todos los services', () => {
    const rules = ORDINAL_PROFILES.map((f) =>
      rule(f.idService, { field: 'gaps', op: 'contains', value: 'IPRL' }, 'fuera'),
    );
    const { eligible, excluded } = filtro.filter(ORDINAL_PROFILES, rules, FACTS);
    expect(eligible).toHaveLength(0);
    expect(excluded).toHaveLength(3);
  });
});
