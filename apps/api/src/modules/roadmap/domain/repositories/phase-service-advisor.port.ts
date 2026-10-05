import type {
  DimensionCode,
  PhaseServiceTrace,
  ServiceDetail,
} from '@innlab/contracts';
import type { PhaseServiceSnapshot } from '../entities/scaling-roadmap.aggregate.js';

export const PHASE_SERVICE_ADVISOR = Symbol('PHASE_SERVICE_ADVISOR');

/** What a phase asks for its service. */
export interface PhaseServiceRequest {
  readonly diagnosticId: string;
  /** The profile projected to the start of the phase. */
  readonly levels: Readonly<Record<DimensionCode, number>>;
  readonly work: readonly {
    readonly dimension: DimensionCode;
    readonly fromLevel: number;
    readonly toLevel: number;
  }[];
  /** The tier of the previous phase's service: the route never goes lighter. */
  readonly minimumTierOrder: number;
  /** Services earlier phases already proposed. */
  readonly excludedServiceIds: readonly number[];
  /** The first phase opens with the portfolio recommendation itself. */
  readonly mode: 'RECOMMENDATION' | 'PHASE';
}

/**
 * The portfolio, as the roadmap needs it: which service could be contracted
 * for a phase, and the card of a service. Declared here and implemented by
 * an adapter over the read-only queries `routing/` exports — the roadmap
 * never reaches into the routing configuration.
 */
export interface PhaseServiceAdvisorPort {
  /** `null` only when the routing configuration is not loaded. */
  advise(request: PhaseServiceRequest): Promise<{
    readonly service: PhaseServiceSnapshot | null;
    readonly trace: PhaseServiceTrace;
  } | null>;
  describe(
    serviceIds: readonly number[],
  ): Promise<ReadonlyMap<number, ServiceDetail>>;
}
