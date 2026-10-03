import { describe, expect, it } from '@jest/globals';
import { EvaluatePhaseServiceQuery } from '../../../../../../src/modules/routing/application/use-cases/evaluate-phase-service.query.js';
import type { RoutingConfigurationRepositoryPort } from '../../../../../../src/modules/routing/domain/repositories/routing-configuration.repository.port.js';
import type { InitiativeCharacterizationPort } from '../../../../../../src/modules/routing/domain/repositories/initiative-characterization.port.js';
import { OrdinalTranslatorService } from '../../../../../../src/modules/routing/domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from '../../../../../../src/modules/routing/domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from '../../../../../../src/modules/routing/domain/services/affinity-scorer.service.js';
import { PhaseAffinityScorerService } from '../../../../../../src/modules/routing/domain/services/phase-affinity-scorer.service.js';
import { ExceptionEngineService } from '../../../../../../src/modules/routing/domain/services/exception-engine.service.js';
import { RoutingConfigurationMissingError } from '../../../../../../src/modules/routing/domain/exceptions/routing.errors.js';
import {
  ID_BY_SERVICE,
  seedConfiguration,
} from '../../support/seed-configuration.js';

/**
 * The service of each phase of AgroConecta's route, on the seeded
 * (simulated) configuration. Profile: TRL 6 · CRL 4 · BRL 3 · IPRL 1 ·
 * TmRL 5 · FRL 2; stage validación, three people.
 */
const AGROCONECTA = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 };

function query(configured = true): EvaluatePhaseServiceQuery {
  const configuration = {
    load: () => Promise.resolve(configured ? seedConfiguration() : null),
  } as unknown as RoutingConfigurationRepositoryPort;
  const characterizations = {
    findByDiagnosticId: () =>
      Promise.resolve({
        stage: 'validacion',
        sector: 'Agroindustria / AgriTech',
        teamSize: 3,
      }),
  } as unknown as InitiativeCharacterizationPort;
  return new EvaluatePhaseServiceQuery(
    configuration,
    characterizations,
    new OrdinalTranslatorService(),
    new EligibilityFilterService(),
    new AffinityScorerService(),
    new PhaseAffinityScorerService(),
    new ExceptionEngineService(),
  );
}

const ok = async (
  q: EvaluatePhaseServiceQuery,
  input: Parameters<EvaluatePhaseServiceQuery['execute']>[0],
) => {
  const result = await q.execute(input);
  if (!result.ok) throw new Error('expected ok result');
  return result.value;
};

describe('EvaluatePhaseServiceQuery — the service of each phase of the route', () => {
  it('the first phase opens with the portfolio recommendation itself', async () => {
    const value = await ok(query(), {
      diagnosticId: 'diag',
      levels: AGROCONECTA,
      work: [
        { dimension: 'CRL', fromLevel: 4, toLevel: 5 },
        { dimension: 'IPRL', fromLevel: 1, toLevel: 3 },
      ],
      minimumTierOrder: 1,
      excludedServiceIds: [],
      mode: 'RECOMMENDATION',
    });

    expect(value.service).toEqual({
      idService: ID_BY_SERVICE.get('Célula de Grado · Posgrado'),
      name: 'Célula de Grado · Posgrado',
      tierOrder: 3,
      approximate: false,
    });
    expect(value.trace.mode).toBe('RECOMMENDATION');
    // A team of three: no eligibility rule leaves a service out.
    expect(value.trace.excluded).toEqual([]);
  });

  it('a next phase gets the service that best works its dimensions, never one already proposed', async () => {
    const value = await ok(query(), {
      diagnosticId: 'diag',
      levels: { TRL: 6, CRL: 5, BRL: 3, IPRL: 3, TmRL: 5, FRL: 2 },
      work: [
        { dimension: 'BRL', fromLevel: 3, toLevel: 5 },
        { dimension: 'IPRL', fromLevel: 3, toLevel: 5 },
      ],
      minimumTierOrder: 1,
      excludedServiceIds: [ID_BY_SERVICE.get('Reto Express')!],
      mode: 'PHASE',
    });

    expect(value.service).toMatchObject({
      name: 'Reto en el Aula',
      tierOrder: 2,
      approximate: false,
    });
    expect(value.trace.skipped).toEqual([
      { name: 'Reto Express', reason: 'ALREADY_IN_ROUTE' },
    ]);
    // Reto en el Aula: Negocio secondary × 2 levels × 1.5 + stage 0.8 = 2.3.
    expect(value.trace.ranking[0]).toMatchObject({
      name: 'Reto en el Aula',
      score: 2.3,
      coverage: [
        { dimension: 'BRL', sourceLabel: 'secondary', levels: 2 },
        { dimension: 'IPRL', sourceLabel: 'not_applicable', levels: 2 },
      ],
    });
    // INC-02 still applies on the projected profile (three gaps): the
    // center's adjustments work in the route as in the recommendation.
    expect(value.trace.ranking[1]).toMatchObject({
      name: 'Academia a la Medida',
      score: null,
      includedBy: { ruleCode: 'INC-02' },
    });
  });

  it('never goes lighter than the previous phase, and shows the best one as approximate when none fits', async () => {
    const value = await ok(query(), {
      diagnosticId: 'diag',
      levels: { TRL: 6, CRL: 5, BRL: 5, IPRL: 5, TmRL: 5, FRL: 2 },
      work: [{ dimension: 'FRL', fromLevel: 2, toLevel: 4 }],
      minimumTierOrder: 2,
      excludedServiceIds: [
        ID_BY_SERVICE.get('Reto Express')!,
        ID_BY_SERVICE.get('Reto en el Aula')!,
        ID_BY_SERVICE.get('Célula de Grado · Posgrado')!,
      ],
      mode: 'PHASE',
    });

    // No service of the portfolio works Financiación: none reaches the
    // phase's minimum, and the best available is shown as approximate.
    expect(value.service).toMatchObject({
      name: 'Semillero con Propósito',
      approximate: true,
    });
    expect(value.trace.ranking.every((r) => r.tierOrder >= 2)).toBe(true);
    expect(value.trace.skipped).toEqual(
      expect.arrayContaining([
        { name: 'Reto Express', reason: 'ALREADY_IN_ROUTE' },
        { name: 'Reto en el Aula', reason: 'ALREADY_IN_ROUTE' },
      ]),
    );
  });

  it('has no service when the route leaves no candidate', async () => {
    const value = await ok(query(), {
      diagnosticId: 'diag',
      levels: AGROCONECTA,
      work: [{ dimension: 'FRL', fromLevel: 2, toLevel: 4 }],
      minimumTierOrder: 9,
      excludedServiceIds: [],
      mode: 'PHASE',
    });

    expect(value.service).toBeNull();
    expect(value.trace.ranking).toEqual([]);
    expect(value.trace.skipped.every((s) => s.reason === 'LIGHTER_TIER')).toBe(
      true,
    );
  });

  it('answers that the configuration is missing instead of guessing', async () => {
    const result = await query(false).execute({
      diagnosticId: 'diag',
      levels: AGROCONECTA,
      work: [],
      minimumTierOrder: 1,
      excludedServiceIds: [],
      mode: 'PHASE',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(RoutingConfigurationMissingError);
  });
});
