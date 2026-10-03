import type { DimensionCode } from '@innlab/contracts';
import {
  CALIBRATION_SCALE,
  ELIGIBILITY_RULES,
  EXCEPTION_RULES,
  ORDINAL_PROFILES,
  SCORING_PARAMETERS,
  SERVICES,
  SERVICE_TIERS,
} from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/routing.js';
import { CalibrationScale } from '../../../../../src/modules/routing/domain/value-objects/calibration-scale.vo.js';
import { PredicateCompilerService } from '../../../../../src/modules/routing/domain/services/predicate-compiler.service.js';
import type { ResolvedConfiguration } from '../../../../../src/modules/routing/domain/repositories/routing-configuration.repository.port.js';

/** The id each service gets when seeded in order (identity column). */
export const ID_BY_SERVICE = new Map(
  SERVICES.map((s, i) => [s.name, i + 1] as const),
);

/**
 * The routing configuration the seed plants, built in memory as the
 * configuration repository would load it: the engine is exercised on the
 * real (simulated) data, not on a parallel fixture.
 */
export function seedConfiguration(): ResolvedConfiguration {
  const compiler = new PredicateCompilerService();
  const adjustmentOnly = new Set(
    SERVICES.filter((s) => s.adjustmentOnly).map((s) => s.name),
  );
  const tierOrder = new Map(
    SERVICE_TIERS.map((t) => [t.code, t.order] as const),
  );
  return {
    scale: CalibrationScale.create(
      CALIBRATION_SCALE.map((p) => ({
        label: p.label,
        value: p.value,
        order: p.order,
      })),
    ),
    parameters: {
      bottleneckWeight: SCORING_PARAMETERS.bottleneckWeight,
      gapWeight: SCORING_PARAMETERS.gapWeight,
      moderateImbalanceWeight: SCORING_PARAMETERS.moderateImbalanceWeight,
      criticalImbalanceWeight: SCORING_PARAMETERS.criticalImbalanceWeight,
      stageAffinityWeight: SCORING_PARAMETERS.stageAffinityWeight,
      outOfRangePenalty: SCORING_PARAMETERS.outOfRangePenalty,
      minimumThreshold: SCORING_PARAMETERS.minimumThreshold,
      alternativesCount: SCORING_PARAMETERS.alternativesCount,
    },
    phaseParameters: {
      coverageWeight: SCORING_PARAMETERS.phaseCoverageWeight,
      minimumThreshold: SCORING_PARAMETERS.phaseMinimumThreshold,
    },
    profiles: ORDINAL_PROFILES.filter(
      (f) => !adjustmentOnly.has(f.service),
    ).map((f) => ({
      idService: ID_BY_SERVICE.get(f.service)!,
      serviceName: f.service,
      minLevel: f.minLevel!,
      maxLevel: f.maxLevel!,
      relevantStages: f.relevantStages,
      intensities: new Map(
        Object.entries(f.intensities) as [DimensionCode, string][],
      ),
    })),
    adjustmentOnlyServices: SERVICES.filter((s) => s.adjustmentOnly).map(
      (s) => ({
        idService: ID_BY_SERVICE.get(s.name)!,
        serviceName: s.name,
      }),
    ),
    eligibilityRules: ELIGIBILITY_RULES.map((r) => ({
      code: r.code,
      idService: ID_BY_SERVICE.get(r.service)!,
      expression: compiler.compile(r.predicate, 'BOOLEAN'),
      exclusionMessage: r.exclusionMessage,
    })),
    exceptionRules: EXCEPTION_RULES.map((r) => ({
      code: r.code,
      priorityOrder: r.priorityOrder,
      expression: compiler.compile(r.predicate, 'WITH_DEGREE'),
      action: r.action,
      idTargetService: ID_BY_SERVICE.get(r.targetService)!,
      positions: r.positions,
      declaredReason: r.declaredReason,
    })),
    tierOrderByService: new Map(
      SERVICES.map(
        (s) => [ID_BY_SERVICE.get(s.name)!, tierOrder.get(s.tier)!] as const,
      ),
    ),
  };
}
