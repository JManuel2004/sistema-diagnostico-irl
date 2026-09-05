import type { MaturityProfile } from '../entities/maturity-profile.aggregate.js';

/**
 * Repository port for the `MaturityProfile` aggregate.
 *
 * One `MaturityProfile` per `Diagnostico`. The aggregate is loaded by
 * `diagnosticId` because external modules know the diagnostic, not the
 * synthetic `resultado_dimension` row ids.
 *
 * Atomicity contract (DIAGIRL-34 acceptance criterion "no guarda
 * resultados parciales"): `save(profile)` MUST persist all six
 * `resultado_dimension` rows inside a single database transaction. If
 * any row write fails the whole save is rolled back — the database
 * never exposes a partial profile.
 *
 * The upsert key is the unique constraint
 * `uq_resultado_diag_dim (id_diagnostico, id_dimension)` declared in
 * the migration. The TypeORM adapter (Stage 5) replaces the entire row
 * set per call to keep the in-memory aggregate and the persisted state
 * fully consistent.
 *
 * DIAGIRL-35 (bottleneck) and DIAGIRL-38 (imbalance) need to update the
 * boolean flags (`es_cuello_botella`, `en_estado_critico`) on individual
 * rows. Those features will extend this port with targeted update
 * methods (e.g. `markBottleneck(diagnosticId, dimensionCode)`) — they
 * do NOT round-trip the whole aggregate.
 */
export const MATURITY_PROFILE_REPOSITORY = Symbol(
  'MATURITY_PROFILE_REPOSITORY',
);

export interface MaturityProfileRepositoryPort {
  /**
   * Atomically persist the six `DimensionResult` rows backing `profile`.
   *
   * Replace-all semantics: any prior `resultado_dimension` rows for the
   * same `diagnosticId` are overwritten in the same transaction.
   * `en_estado_critico` is written from the IRL gap threshold
   * (`CRITICAL_IRL_THRESHOLD`). `es_cuello_botella` remains derived
   * in the aggregate until a dedicated persist lands.
   *
   * @throws when the underlying transaction fails; the caller maps it
   *   to a `MaturityProfileCalculationError` (HTTP 500).
   */
  save(profile: MaturityProfile): Promise<void>;

  /**
   * Hydrate the profile for `diagnosticId`, or `null` if it has not
   * been computed yet (the diagnostic exists but is still in state
   * `CUESTIONARIO_COMPLETO` and hasn't transitioned to
   * `PERFIL_GENERADO`).
   */
  findByDiagnosticId(diagnosticId: string): Promise<MaturityProfile | null>;
}
