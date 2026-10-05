import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../value-objects/ordinal-profile.vo.js';
import type { AdjustmentOnlyService } from '../value-objects/adjustment-only-service.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { PhaseScoringParameters } from '../value-objects/phase-scoring-parameters.vo.js';
import type { ServiceCatalogEntry } from '../value-objects/service-catalog-entry.vo.js';
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
  /** The weights of the route by phases. */
  readonly phaseParameters: PhaseScoringParameters;
  /** The scored services: the only ones layers 1 and 2 see. */
  readonly profiles: readonly OrdinalProfile[];
  /** The services only an `INCLUDE` adjustment brings into a result. */
  readonly adjustmentOnlyServices: readonly AdjustmentOnlyService[];
  readonly eligibilityRules: readonly CompiledEligibilityRule[];
  readonly exceptionRules: readonly CompiledExceptionRule[];
  /**
   * The tier order of every service (scored and adjustment-only), by id:
   * 1 is the lightest. Only the route by phases uses it.
   */
  readonly tierOrderByService: ReadonlyMap<number, number>;
}

export interface RoutingConfigurationRepositoryPort {
  /** The live configuration, or `null` if none has been seeded yet. */
  load(): Promise<ResolvedConfiguration | null>;
  /**
   * The catalog card of every service, by id. Read live rather than
   * snapshotted into a result: it describes the service, not the result.
   */
  findServiceCatalog(): Promise<ReadonlyMap<number, ServiceCatalogEntry>>;
}
