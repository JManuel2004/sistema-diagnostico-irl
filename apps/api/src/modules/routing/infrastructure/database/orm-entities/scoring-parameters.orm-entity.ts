import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../../infrastructure/database/numeric.transformer.js';

/**
 * The global weights of the affinity score.
 *
 * Singleton table (`ux_scoring_parameters_singleton`) — the configuration
 * versioning scheme this table used to be scoped under was retired
 * (backlog 5.6); there is one live set of weights, not a published
 * snapshot among several.
 *
 * `minimumThreshold` is the cutoff below which a candidate is not offered at
 * all; `alternativesCount` is how many runners-up accompany the principal
 * recommendation.
 */
@Entity({ schema: 'irl_catalog', name: 'scoring_parameters' })
export class ScoringParametersOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

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
}
