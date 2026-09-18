import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The audit record of one evaluation: what each layer did.
 *
 * `appliedExceptions` holds the ranking before and after *each*
 * individual exception, not just the aggregate outcome. Without that
 * granularity a recommendation questioned months later cannot be
 * attributed to the specific adjustment that produced it — which is the
 * whole point of keeping the trace.
 *
 * Survives the retirement of the configuration versioning scheme
 * (backlog 5.6) unchanged in purpose: this is the audit trail of one
 * individual calculation, not versioning of configuration. It used to
 * also denormalise which configuration version/snapshots were pinned at
 * evaluation time; those three columns are dropped along with the
 * scheme they pointed at — with a single live configuration there is
 * nothing left to denormalise against.
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

  @Column({ name: 'facts_hash', type: 'varchar', length: 64 })
  factsHash!: string;

  @Column({ name: 'evaluated_at', type: 'timestamptz', default: () => 'now()' })
  evaluatedAt!: Date;
}
