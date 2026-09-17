import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The audit record of one evaluation: what each layer did, and against
 * which frozen configuration it did it.
 *
 * `appliedExceptions` holds the ranking before and after *each*
 * individual exception, not just the aggregate outcome. Without that
 * granularity a recommendation questioned months later cannot be
 * attributed to the specific adjustment that produced it — which is the
 * whole point of keeping the trace.
 *
 * The three snapshot ids are denormalised from the version on purpose:
 * reproducing an evaluation must not depend on the version row still
 * pointing where it pointed at the time.
 */
@Entity({ schema: 'irl_diagnostic', name: 'layer_trace' })
export class LayerTraceOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_recommendation', type: 'bigint' })
  idRecommendation!: string;

  @Column({ name: 'layer_1_excluded', type: 'jsonb' })
  layer1Excluded!: unknown;

  @Column({ name: 'ranking_before_exceptions', type: 'jsonb' })
  rankingBeforeExceptions!: unknown;

  @Column({ name: 'applied_exceptions', type: 'jsonb' })
  appliedExceptions!: unknown;

  @Column({ name: 'discarded_exceptions', type: 'jsonb' })
  discardedExceptions!: unknown;

  @Column({ name: 'ranking_after_exceptions', type: 'jsonb' })
  rankingAfterExceptions!: unknown;

  @Column({ name: 'id_configuration_version', type: 'bigint' })
  idConfigurationVersion!: string;

  @Column({ name: 'id_calibration_snapshot', type: 'bigint' })
  idCalibrationSnapshot!: string;

  @Column({ name: 'id_parameters_snapshot', type: 'bigint' })
  idParametersSnapshot!: string;

  @Column({ name: 'facts_hash', type: 'varchar', length: 64 })
  factsHash!: string;

  @Column({ name: 'evaluated_at', type: 'timestamptz', default: () => 'now()' })
  evaluatedAt!: Date;
}
