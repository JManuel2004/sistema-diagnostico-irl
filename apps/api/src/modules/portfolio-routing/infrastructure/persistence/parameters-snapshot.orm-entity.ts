import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

/**
 * The global weights of the affinity score, frozen at publish time.
 *
 * `minimumThreshold` is the cutoff below which a candidate is not offered at
 * all; `alternativesCount` is how many runners-up accompany the principal
 * recommendation.
 */
@Entity({ schema: 'irl_catalog', name: 'parameters_snapshot' })
export class ParametersSnapshotOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  idParametersSnapshot!: string;

  @Column({ name: 'number', type: 'integer' })
  number!: number;

  @Column({ name: 'author_id', type: 'varchar', length: 64 })
  authorId!: string;

  @Column({ name: 'comment', type: 'varchar', length: 500, nullable: true })
  comment!: string | null;

  @Column({ name: 'bottleneck_weight', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  bottleneckWeight!: number;

  @Column({ name: 'gap_weight', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  gapWeight!: number;

  @Column({ name: 'moderate_imbalance_weight', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  moderateImbalanceWeight!: number;

  @Column({ name: 'critical_imbalance_weight', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  criticalImbalanceWeight!: number;

  @Column({ name: 'stage_affinity_weight', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  stageAffinityWeight!: number;

  @Column({ name: 'out_of_range_penalty', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  outOfRangePenalty!: number;

  @Column({ name: 'minimum_threshold', type: 'numeric', precision: 5, scale: 2, transformer: numericTransformer })
  minimumThreshold!: number;

  @Column({ name: 'alternatives_count', type: 'integer' })
  alternativesCount!: number;

  @Column({ name: 'state', type: 'varchar', length: 16 })
  state!: string;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
