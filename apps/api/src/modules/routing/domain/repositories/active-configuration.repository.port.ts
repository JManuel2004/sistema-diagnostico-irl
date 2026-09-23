import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../value-objects/ordinal-profile.vo.js';
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
export const ACTIVE_CONFIGURATION_REPOSITORY = Symbol(
  'ACTIVE_CONFIGURATION_REPOSITORY',
);

export interface ResolvedConfiguration {
  readonly scale: CalibrationScale;
  readonly parameters: ScoringParameters;
  readonly profiles: readonly OrdinalProfile[];
  readonly eligibilityRules: readonly CompiledEligibilityRule[];
  readonly exceptionRules: readonly CompiledExceptionRule[];
}

export interface ActiveConfigurationRepositoryPort {
  /** The live configuration, or `null` if none has been seeded yet. */
  load(): Promise<ResolvedConfiguration | null>;
}
