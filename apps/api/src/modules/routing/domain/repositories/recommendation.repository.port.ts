import type { Recommendation } from '../entities/recommendation.aggregate.js';

/**
 * Port of the `Recommendation` aggregate.
 *
 * Atomicity contract, explicit and non-negotiable: `save` persists the
 * recommendation, its alternatives and its trace **within a single
 * transaction**. They are three writes of one fact; a recommendation
 * without a trace is a black box, and orphan alternatives are garbage.
 *
 * It is stated here because a docstring promising atomicity is not
 * enough on its own: the adapter wraps the writes in
 * `manager.transaction()` and an integration test verifies it.
 */
export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');

export interface RecommendationRepositoryPort {
  save(recommendation: Recommendation): Promise<void>;
  findByDiagnosticId(diagnosticId: string): Promise<Recommendation | null>;
}
