import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../value-objects/ordinal-profile.vo.js';
import type { AdjustmentOnlyService } from '../value-objects/adjustment-only-service.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { CompiledEligibilityRule } from '../services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../services/exception-engine.service.js';

/**
 * Read port of the routing configuration.
 *
 * Read-only by design: the query engine cannot write configuration.
 *
 * Not versioned: the configuration versioning scheme was retired — nothing
 * in the system can publish a second version, so the port exposes a single
 * live configuration, with no history to number and no specific version to
 * load.
 */
export const ROUTING_CONFIGURATION_REPOSITORY = Symbol(
  'ROUTING_CONFIGURATION_REPOSITORY',
);

export interface ResolvedConfiguration {
  readonly scale: CalibrationScale;
  readonly parameters: ScoringParameters;
  /** The scored services: the only ones layers 1 and 2 see. */
  readonly profiles: readonly OrdinalProfile[];
  /** The services only an `INCLUDE` adjustment brings into a result. */
  readonly adjustmentOnlyServices: readonly AdjustmentOnlyService[];
  readonly eligibilityRules: readonly CompiledEligibilityRule[];
  readonly exceptionRules: readonly CompiledExceptionRule[];
}

export interface RoutingConfigurationRepositoryPort {
  /** The live configuration, or `null` if none has been seeded yet. */
  load(): Promise<ResolvedConfiguration | null>;
  /**
   * The catalog description of every service, by id. Read live rather than
   * snapshotted into the recommendation: it describes the service, not the
   * result.
   */
  findServiceDescriptions(): Promise<ReadonlyMap<number, string | null>>;
}
